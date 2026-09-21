-- TallerPro - Corrección de incidentes funcionales
-- Fecha: 2026-09-20
-- Ejecutar en Supabase SQL Editor después de la migración base.
-- No contiene credenciales ni claves secretas.

begin;

-- ============================================================
-- 1. Agenda: appointments.mechanic_id debe apuntar a mechanics.id
-- ============================================================

update public.appointments a
set mechanic_id = (
  select m.id
  from public.organization_members om
  join public.mechanics m
    on m.organization_id = a.organization_id
   and m.user_id = om.user_id
  where om.id = a.mechanic_id
  limit 1
)
where a.mechanic_id is not null
  and exists (
    select 1
    from public.organization_members om
    join public.mechanics m
      on m.organization_id = a.organization_id
     and m.user_id = om.user_id
    where om.id = a.mechanic_id
  );

alter table public.appointments
  alter table public.appointments
  add constraint appointments_mechanic_id_fkey
  foreign key (mechanic_id)
  references public.mechanics(id)
  on delete set null;

create index if not exists idx_appointments_mechanic
  on public.appointments(organization_id, mechanic_id, starts_at desc);

-- ============================================================
-- 2. Mano de obra por mecánico
-- ============================================================

alter table public.service_order_items
  add column if not exists mechanic_id uuid
  references public.mechanics(id)
  on delete set null;

create index if not exists idx_service_order_items_mechanic
  on public.service_order_items(service_order_id, mechanic_id);

-- ============================================================
-- 3. Factura sincronizada con orden + impuestos del taller
-- ============================================================

create or replace function public.sync_service_order_invoice(
  p_service_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_order public.service_orders%rowtype;
  v_invoice public.invoices%rowtype;
  v_invoice_id uuid;
  v_invoice_number text;
  v_subtotal numeric(14,2);
  v_tax_rate numeric(8,4) := 0;
  v_tax numeric(14,2);
  v_total numeric(14,2);
  v_paid numeric(14,2) := 0;
  v_status text := 'pending';
  v_max_no bigint;
begin
  if v_user_id is null then
    raise exception 'Sesión no válida.';
  end if;

  select *
    into v_order
  from public.service_orders
  where id = p_service_order_id;

  if not found then
    raise exception 'La orden de servicio no existe.';
  end if;

  v_org_id := v_order.organization_id;

  if not public.is_org_member(v_org_id) then
    raise exception 'No tienes permisos para modificar esta orden.';
  end if;

  select coalesce(o.tax_rate, 0)
    into v_tax_rate
  from public.organizations o
  where o.id = v_org_id;

  select coalesce(
    sum(coalesce(i.quantity,0) * coalesce(i.unit_price,0)),
    0
  )::numeric(14,2)
    into v_subtotal
  from public.service_order_items i
  where i.service_order_id = p_service_order_id;

  v_tax := round(v_subtotal * v_tax_rate / 100, 2);
  v_total := v_subtotal + v_tax;

  select *
    into v_invoice
  from public.invoices
  where service_order_id = p_service_order_id
    and organization_id = v_org_id
  order by issued_at desc
  limit 1
  for update;

  if found then
    v_invoice_id := v_invoice.id;
    v_invoice_number := v_invoice.invoice_number;
    v_paid := least(coalesce(v_invoice.paid,0), v_total);

    if coalesce(v_invoice.paid,0) > v_total then
      raise exception
        'La factura % tiene pagos superiores al nuevo total. Corrige el saldo antes de sincronizar la orden.',
        v_invoice.invoice_number;
    end if;

    v_status := case
      when v_invoice.status = 'void' then 'void'
      when v_total > 0 and v_paid >= v_total then 'paid'
      when v_paid > 0 then 'partial'
      else 'pending'
    end;

    update public.invoices
    set customer_id = v_order.customer_id,
        subtotal = v_subtotal,
        tax = v_tax,
        total = v_total,
        paid = v_paid,
        status = v_status,
        due_at = coalesce(due_at, now())
    where id = v_invoice_id;
  else
    select coalesce(
      max(nullif(regexp_replace(invoice_number,'[^0-9]','','g'),'')::bigint),
      0
    )
      into v_max_no
    from public.invoices
    where organization_id = v_org_id;

    v_invoice_number := 'FAC-' || lpad((v_max_no + 1)::text, 6, '0');

    insert into public.invoices(
      organization_id,
      service_order_id,
      customer_id,
      invoice_number,
      subtotal,
      tax,
      total,
      paid,
      status,
      due_at
    )
    values(
      v_org_id,
      p_service_order_id,
      v_order.customer_id,
      v_invoice_number,
      v_subtotal,
      v_tax,
      v_total,
      0,
      case when v_total > 0 then 'pending' else 'pending' end,
      now()
    )
    returning id into v_invoice_id;
  end if;

  update public.service_orders
  set subtotal = v_subtotal,
      tax = v_tax,
      total = v_total
  where id = p_service_order_id;

  return jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'service_order_id', p_service_order_id,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total,
    'paid', v_paid,
    'status', v_status
  );
end;
$$;

grant execute on function public.sync_service_order_invoice(uuid)
to authenticated;

-- ============================================================
-- 4. Cambios de conceptos actualizan orden + factura
-- ============================================================

create or replace function public.service_order_items_invoice_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_service_order_invoice(
    case when tg_op = 'DELETE' then old.service_order_id else new.service_order_id end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists service_order_items_invoice_sync on public.service_order_items;

create trigger service_order_items_invoice_sync
after insert or update or delete on public.service_order_items
for each row
execute function public.service_order_items_invoice_sync_trigger();

create or replace function public.service_order_delivery_invoice_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered' or old.status = 'delivered' then
    perform public.sync_service_order_invoice(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists service_order_delivery_invoice_sync on public.service_orders;

create trigger service_order_delivery_invoice_sync
after update of status, delivered_at on public.service_orders
for each row
execute function public.service_order_delivery_invoice_sync_trigger();

-- ============================================================
-- 5. Agregar mano de obra a una orden
-- ============================================================

create or replace function public.add_service_order_labor(
  p_service_order_id uuid,
  p_mechanic_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_order public.service_orders%rowtype;
  v_mechanic public.mechanics%rowtype;
  v_item_id uuid;
  v_unit_cost numeric(14,2);
  v_total numeric(14,2);
begin
  if v_user_id is null then
    raise exception 'Sesión no válida.';
  end if;

  select * into v_order
  from public.service_orders
  where id = p_service_order_id;

  if not found then
    raise exception 'La orden de servicio no existe.';
  end if;

  v_org_id := v_order.organization_id;

  if not public.is_org_member(v_org_id) then
    raise exception 'No tienes permisos para modificar esta orden.';
  end if;

  if v_order.status in ('delivered','cancelled') then
    raise exception 'La orden ya está cerrada y no permite agregar mano de obra.';
  end if;

  if p_mechanic_id is null then
    raise exception 'Debes seleccionar el mecánico responsable de la mano de obra.';
  end if;

  select * into v_mechanic
  from public.mechanics
  where id = p_mechanic_id
    and organization_id = v_org_id
    and active = true;

  if not found then
    raise exception 'El mecánico seleccionado no existe, está inactivo o no pertenece a esta organización.';
  end if;

  if trim(coalesce(p_description,'')) = '' then
    raise exception 'La descripción del trabajo es obligatoria.';
  end if;

  if coalesce(p_quantity,0) <= 0 then
    raise exception 'Las horas deben ser mayores que cero.';
  end if;

  if coalesce(p_unit_price,0) < 0 then
    raise exception 'El valor de la hora no puede ser negativo.';
  end if;

  v_unit_cost := coalesce(v_mechanic.hourly_cost,0);
  v_total := round(p_quantity * p_unit_price, 2);

  insert into public.service_order_items(
    service_order_id,
    item_type,
    mechanic_id,
    inventory_product_id,
    description,
    quantity,
    unit_cost,
    unit_price
  )
  values(
    p_service_order_id,
    'service',
    p_mechanic_id,
    null,
    trim(p_description),
    p_quantity,
    v_unit_cost,
    p_unit_price
  )
  returning id into v_item_id;

  perform public.sync_service_order_invoice(p_service_order_id);

  return jsonb_build_object(
    'id', v_item_id,
    'mechanic_id', p_mechanic_id,
    'mechanic_name', v_mechanic.full_name,
    'quantity', p_quantity,
    'unit_cost', v_unit_cost,
    'unit_price', p_unit_price,
    'total', v_total
  );
end;
$$;

grant execute on function public.add_service_order_labor(uuid,uuid,text,numeric,numeric)
to authenticated;

-- ============================================================
-- 6. Consumo de repuesto desde inventario
-- ============================================================

create or replace function public.consume_service_order_part(
  p_service_order_id uuid,
  p_inventory_product_id uuid,
  p_quantity numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_order public.service_orders%rowtype;
  v_product public.inventory_products%rowtype;
  v_item_id uuid;
  v_new_stock numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'Sesión no válida.';
  end if;

  select * into v_order
  from public.service_orders
  where id = p_service_order_id;

  if not found then
    raise exception 'La orden de servicio no existe.';
  end if;

  v_org_id := v_order.organization_id;

  if not public.is_org_member(v_org_id) then
    raise exception 'No tienes permisos para modificar esta orden.';
  end if;

  if v_order.status in ('delivered','cancelled') then
    raise exception 'La orden ya está cerrada y no permite consumo de inventario.';
  end if;

  if coalesce(p_quantity,0) <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  select * into v_product
  from public.inventory_products
  where id = p_inventory_product_id
    and organization_id = v_org_id
    and active = true
  for update;

  if not found then
    raise exception 'Repuesto no encontrado o no pertenece a la organización.';
  end if;

  if coalesce(v_product.stock,0) < p_quantity then
    raise exception 'Stock insuficiente para "%". Disponible: %, solicitado: %.',
      v_product.name, coalesce(v_product.stock,0), p_quantity;
  end if;

  insert into public.service_order_items(
    service_order_id,
    item_type,
    mechanic_id,
    inventory_product_id,
    description,
    quantity,
    unit_cost,
    unit_price
  )
  values(
    p_service_order_id,
    'part',
    v_order.mechanic_id,
    v_product.id,
    v_product.name,
    p_quantity,
    coalesce(v_product.cost,0),
    coalesce(v_product.sale_price,0)
  )
  returning id into v_item_id;

  update public.inventory_products
  set stock = stock - p_quantity,
      updated_at = now()
  where id = v_product.id
    and organization_id = v_org_id
  returning stock into v_new_stock;

  insert into public.inventory_movements(
    organization_id,
    inventory_product_id,
    movement_type,
    quantity,
    unit_cost,
    service_order_id,
    reference,
    created_by
  )
  values(
    v_org_id,
    v_product.id,
    'order_usage',
    -p_quantity,
    coalesce(v_product.cost,0),
    p_service_order_id,
    'ORDEN-' || p_service_order_id::text,
    v_user_id
  );

  perform public.sync_service_order_invoice(p_service_order_id);

  return jsonb_build_object(
    'id', v_item_id,
    'product_id', v_product.id,
    'product_name', v_product.name,
    'quantity', p_quantity,
    'new_stock', coalesce(v_new_stock,0),
    'unit_cost', coalesce(v_product.cost,0),
    'unit_price', coalesce(v_product.sale_price,0)
  );
end;
$$;

grant execute on function public.consume_service_order_part(uuid,uuid,numeric)
to authenticated;

-- ============================================================
-- 7. Crear/refrescar factura desde una orden entregada
-- ============================================================

create or replace function public.create_invoice_from_service_order(
  p_service_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_status text;
begin
  v_result := public.sync_service_order_invoice(p_service_order_id);
  v_status := coalesce(v_result->>'status','pending');

  return v_result || jsonb_build_object(
    'ready_for_payment', v_status in ('pending','partial')
  );
end;
$$;

grant execute on function public.create_invoice_from_service_order(uuid)
to authenticated;

-- ============================================================
-- 8. Registrar abonos de facturas y movimiento de caja
-- ============================================================

drop function if exists public.register_invoice_payment(uuid,numeric,text,text);

create or replace function public.register_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice public.invoices%rowtype;
  v_org_id uuid;
  v_balance numeric(14,2);
  v_new_paid numeric(14,2);
  v_new_status text;
  v_payment_id uuid;
  v_cash_register_id uuid;
  v_method text := lower(trim(coalesce(p_method,'cash')));
begin
  if v_user_id is null then
    raise exception 'Sesión no válida.';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'La factura no existe.';
  end if;

  v_org_id := v_invoice.organization_id;

  if not public.is_org_member(v_org_id) then
    raise exception 'No tienes permisos para registrar pagos de esta factura.';
  end if;

  if v_invoice.status = 'void' then
    raise exception 'No se puede abonar una factura anulada.';
  end if;

  if coalesce(p_amount,0) <= 0 then
    raise exception 'El valor del abono debe ser mayor que cero.';
  end if;

  if v_method not in ('cash','transfer','card','other') then
    raise exception 'Forma de pago inválida. Usa efectivo, transferencia, tarjeta u otro.';
  end if;

  v_balance := greatest(coalesce(v_invoice.total,0) - coalesce(v_invoice.paid,0), 0);

  if p_amount > v_balance then
    raise exception 'El abono no puede superar el saldo pendiente de %.', v_balance;
  end if;

  select id into v_cash_register_id
  from public.cash_registers
  where organization_id = v_org_id
    and status = 'open'
  order by opened_at desc
  limit 1;

  if v_cash_register_id is null then
    raise exception 'No existe una caja abierta. Debes abrir una caja antes de registrar el abono.';
  end if;

  insert into public.payments(
    organization_id,
    invoice_id,
    amount,
    method,
    reference,
    paid_at,
    created_by
  )
  values(
    v_org_id,
    p_invoice_id,
    p_amount,
    v_method,
    nullif(trim(coalesce(p_reference,'')),''),
    now(),
    v_user_id
  )
  returning id into v_payment_id;

  v_new_paid := coalesce(v_invoice.paid,0) + p_amount;
  v_new_status := case
    when v_new_paid >= coalesce(v_invoice.total,0) then 'paid'
    when v_new_paid > 0 then 'partial'
    else 'pending'
  end;

  update public.invoices
  set paid = v_new_paid,
      status = v_new_status
  where id = p_invoice_id;

  perform public.add_cash_movement(
    v_cash_register_id,
    'income',
    p_amount,
    'Abono factura ' || v_invoice.invoice_number,
    nullif(trim(coalesce(p_reference,'')),''),
    v_payment_id
  );

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'invoice_id', p_invoice_id,
    'invoice_number', v_invoice.invoice_number,
    'amount', p_amount,
    'paid', v_new_paid,
    'balance', greatest(coalesce(v_invoice.total,0) - v_new_paid, 0),
    'status', v_new_status
  );
end;
$$;

grant execute on function public.register_invoice_payment(uuid,numeric,text,text)
to authenticated;

-- ============================================================
-- 9. Venta Express: cliente opcional + consumidor final + mecánico
-- ============================================================

alter table public.quick_sales
  add column if not exists mechanic_id uuid
  references public.mechanics(id)
  on delete set null;

alter table public.quick_sales
  add column if not exists customer_id uuid
  references public.customers(id)
  on delete set null;

create index if not exists idx_quick_sales_customer
  on public.quick_sales(organization_id, customer_id, created_at desc);

create index if not exists idx_quick_sales_mechanic
  on public.quick_sales(organization_id, mechanic_id, created_at desc);

drop function if exists public.create_quick_service_sale(jsonb,uuid,text);
drop function if exists public.create_quick_service_sale(jsonb,text,uuid);
drop function if exists public.create_quick_service_sale(jsonb,uuid,text,uuid);

create or replace function public.create_quick_service_sale(
  p_items jsonb,
  p_mechanic_id uuid default null,
  p_payment_method text default 'cash',
  p_customer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org uuid;
  v_invoice_id uuid;
  v_quick_id uuid;
  v_invoice_number text;
  v_total numeric(14,2) := 0;
  v_item jsonb;
  v_product public.inventory_products%rowtype;
  v_mechanic public.mechanics%rowtype;
  v_customer public.customers%rowtype;
  v_qty numeric(12,2);
  v_method text := lower(trim(coalesce(p_payment_method,'cash')));
  v_max_no bigint;
  v_has_service boolean := false;
  v_customer_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sesión no válida.';
  end if;

  select organization_id into v_org
  from public.organization_members
  where user_id = v_user_id
  limit 1;

  if v_org is null then
    raise exception 'No hay organización asignada al usuario.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta rápida requiere al menos un concepto.';
  end if;

  if v_method not in ('cash','transfer','card','other') then
    raise exception 'Forma de pago inválida.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if trim(coalesce(v_item->>'description','')) = '' then
      raise exception 'Hay un concepto sin descripción.';
    end if;

    if coalesce((v_item->>'quantity')::numeric,0) <= 0 then
      raise exception 'Cantidad inválida para el concepto %.', v_item->>'description';
    end if;

    if coalesce((v_item->>'unit_price')::numeric,0) < 0 then
      raise exception 'Precio inválido para el concepto %.', v_item->>'description';
    end if;

    if coalesce(v_item->>'item_type','') = 'service' then
      v_has_service := true;
    end if;

    if coalesce(v_item->>'item_type','') = 'part' then
      if nullif(v_item->>'inventory_product_id','') is null then
        raise exception 'El repuesto no tiene producto de inventario asociado.';
      end if;

      select * into v_product
      from public.inventory_products
      where id = (v_item->>'inventory_product_id')::uuid
        and organization_id = v_org
        and active = true
      for update;

      if not found then
        raise exception 'Repuesto no encontrado o no pertenece a la organización.';
      end if;

      v_qty := (v_item->>'quantity')::numeric;

      if coalesce(v_product.stock,0) < v_qty then
        raise exception 'Stock insuficiente para "%". Disponible: %, solicitado: %.',
          v_product.name, coalesce(v_product.stock,0), v_qty;
      end if;

      v_total := v_total + (v_qty * coalesce((v_item->>'unit_price')::numeric,0));
    else
      v_total := v_total + (
        coalesce((v_item->>'quantity')::numeric,0) *
        coalesce((v_item->>'unit_price')::numeric,0)
      );
    end if;
  end loop;

  if v_has_service then
    if p_mechanic_id is null then
      raise exception 'Debes seleccionar el mecánico que realizó el servicio.';
    end if;

    select * into v_mechanic
    from public.mechanics
    where id = p_mechanic_id
      and organization_id = v_org
      and active = true;

    if not found then
      raise exception 'El mecánico seleccionado no existe, está inactivo o no pertenece a esta organización.';
    end if;
  end if;

  if p_customer_id is not null then
    select * into v_customer
    from public.customers
    where id = p_customer_id
      and organization_id = v_org
      and active = true;

    if not found then
      raise exception 'El cliente seleccionado no existe, está inactivo o no pertenece a esta organización.';
    end if;

    v_customer_id := v_customer.id;
  else
    select * into v_customer
    from public.customers
    where organization_id = v_org
      and document_number = '2222222222222'
    order by active desc, created_at asc
    limit 1;

    if not found then
      insert into public.customers(
        organization_id,
        full_name,
        document_number,
        active
      )
      values(
        v_org,
        'Consumidor final',
        '2222222222222',
        true
      )
      returning * into v_customer;
    end if;

    v_customer_id := v_customer.id;
  end if;

  perform public.require_open_cash_register(v_org);

  select coalesce(
    max(nullif(regexp_replace(invoice_number,'[^0-9]','','g'),'')::bigint),
    0
  ) into v_max_no
  from public.invoices
  where organization_id = v_org;

  v_invoice_number := 'FAC-' || lpad((v_max_no + 1)::text, 6, '0');

  insert into public.invoices(
    organization_id,
    service_order_id,
    customer_id,
    invoice_number,
    subtotal,
    tax,
    total,
    paid,
    status
  )
  values(
    v_org,
    null,
    v_customer_id,
    v_invoice_number,
    v_total,
    0,
    v_total,
    0,
    'pending'
  )
  returning id into v_invoice_id;

  insert into public.quick_sales(
    organization_id,
    invoice_id,
    customer_id,
    mechanic_id,
    total,
    created_by
  )
  values(
    v_org,
    v_invoice_id,
    v_customer_id,
    p_mechanic_id,
    v_total,
    v_user_id
  )
  returning id into v_quick_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'item_type','') = 'part' then
      select * into v_product
      from public.inventory_products
      where id = (v_item->>'inventory_product_id')::uuid
        and organization_id = v_org
        and active = true
      for update;
    end if;

    insert into public.quick_sale_items(
      quick_sale_id,
      item_type,
      inventory_product_id,
      description,
      quantity,
      unit_cost,
      unit_price
    )
    values(
      v_quick_id,
      coalesce(v_item->>'item_type','other'),
      nullif(v_item->>'inventory_product_id','')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      case
        when coalesce(v_item->>'item_type','') = 'part' then coalesce(v_product.cost,0)
        else coalesce((v_item->>'unit_cost')::numeric,0)
      end,
      (v_item->>'unit_price')::numeric
    );

    if coalesce(v_item->>'item_type','') = 'part' then
      v_qty := (v_item->>'quantity')::numeric;

      update public.inventory_products
      set stock = stock - v_qty,
          updated_at = now()
      where id = (v_item->>'inventory_product_id')::uuid
        and organization_id = v_org;

      insert into public.inventory_movements(
        organization_id,
        inventory_product_id,
        movement_type,
        quantity,
        unit_cost,
        reference,
        created_by
      )
      values(
        v_org,
        (v_item->>'inventory_product_id')::uuid,
        'sale',
        -v_qty,
        coalesce(v_product.cost,0),
        'VENTA-RAPIDA-' || v_quick_id::text,
        v_user_id
      );
    end if;
  end loop;

  insert into public.payments(
    organization_id,
    invoice_id,
    amount,
    method,
    reference,
    created_by
  )
  values(
    v_org,
    v_invoice_id,
    v_total,
    v_method,
    'VENTA-RAPIDA-' || v_quick_id::text,
    v_user_id
  );

  update public.invoices
  set paid = v_total,
      status = 'paid'
  where id = v_invoice_id;

  return jsonb_build_object(
    'quick_sale_id', v_quick_id,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'customer_id', v_customer_id,
    'customer_name', v_customer.full_name,
    'customer_document', v_customer.document_number,
    'mechanic_id', p_mechanic_id,
    'mechanic_name', case when v_has_service then v_mechanic.full_name else null end,
    'total', v_total,
    'status', 'paid'
  );
end;
$$;

grant execute on function public.create_quick_service_sale(jsonb,uuid,text,uuid)
to authenticated;

notify pgrst, 'reload schema';

commit;
