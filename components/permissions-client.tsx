"use client";

import {
  PERMISSIONS,
  can,
  canRole,
  getRolePermissions,
} from "@/lib/motomil/permissions";

import {
    ROLE_LABELS,
    ROLES,
} from "@/lib/motomil/roles";

export default function PermissionsClient() {
    return (
        <div className="card">
            <div className="section-head">
                <h2>Permisos</h2>
            </div>

            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Rol</th>

                            {Object.keys(PERMISSIONS).map(
                                (p) => (
                                    <th key={p}>
                                        {p}
                                    </th>
                                )
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {ROLES.map((r) => (
                            <tr key={r}>
                                <td>
                                    {ROLE_LABELS[r]}
                                </td>

                                {Object.keys(
                                    PERMISSIONS
                                ).map((p) => (
                                    <td key={p}>
                                        {canRole(
                                            r,
                                            p as any
                                        )
                                            ? "✓"
                                            : "—"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}