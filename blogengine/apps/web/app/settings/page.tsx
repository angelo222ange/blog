"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/use-auth";
import NavbarDropdown from "../../components/NavbarDropdown";
import { updateMe, changePassword, getUsers, createUser, deleteUser } from "../../lib/api";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Profile
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Users (admin only)
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("USER");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {}
    setUsersLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileSaved(false);
    try {
      await updateMe({ name });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Le mot de passe doit faire au moins 6 caracteres" });
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: "success", text: "Mot de passe modifie avec succes" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Erreur" });
    }
    setPasswordSaving(false);
  };

  const handleInvite = async () => {
    setInviteMsg(null);
    if (!inviteEmail || !invitePassword) {
      setInviteMsg({ type: "error", text: "Email et mot de passe requis" });
      return;
    }
    setInviting(true);
    try {
      await createUser({ email: inviteEmail, name: inviteName, role: inviteRole, password: invitePassword });
      setInviteMsg({ type: "success", text: "Utilisateur cree avec succes" });
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInviteRole("USER");
      await loadUsers();
    } catch (err: any) {
      setInviteMsg({ type: "error", text: err.message || "Erreur" });
    }
    setInviting(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || "Erreur");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white bg-orbs flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-white bg-orbs">
      <NavbarDropdown user={user} />

      <main className="max-w-3xl mx-auto px-3 md:px-6 py-8 md:py-12 relative z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Reglages</h1>

        {/* Profile Section */}
        <section className="card-elevated p-5 md:p-7 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Profil</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input max-w-sm"
                placeholder="Votre nom"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="input max-w-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">Role</label>
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">
                {user.role}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              {profileSaved && (
                <span className="text-sm text-emerald-600 font-medium animate-fade-in">Enregistre</span>
              )}
            </div>
          </div>
        </section>

        {/* Password Section */}
        <section className="card-elevated p-5 md:p-7 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Changer le mot de passe</h2>
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">Confirmer</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
              />
            </div>
            {passwordMsg && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                passwordMsg.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-600"
              }`}>
                {passwordMsg.text}
              </div>
            )}
            <button
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {passwordSaving ? "Modification..." : "Modifier le mot de passe"}
            </button>
          </div>
        </section>

        {/* Users Section (admin only) */}
        {user.role === "ADMIN" && (
          <section className="card-elevated p-5 md:p-7">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Utilisateurs</h2>

            {/* User list */}
            <div className="mb-6">
              {usersLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                  Chargement...
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                          {(u.name || u.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.name || "Sans nom"}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          u.role === "ADMIN" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {u.role}
                        </span>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invite form */}
            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Creer un utilisateur</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1 tracking-wider uppercase font-semibold">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input"
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 tracking-wider uppercase font-semibold">Nom</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="input"
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 tracking-wider uppercase font-semibold">Mot de passe</label>
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="input"
                    placeholder="Mot de passe"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 tracking-wider uppercase font-semibold">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="input"
                  >
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
              </div>
              {inviteMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium mb-3 ${
                  inviteMsg.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-red-50 border border-red-200 text-red-600"
                }`}>
                  {inviteMsg.text}
                </div>
              )}
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {inviting ? "Creation..." : "Creer l'utilisateur"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
