import { useMemo, useState } from "react";
import { GlobalSearchBar } from "./GlobalSearchBar.jsx";
import { ManualReviewTable } from "./ManualReviewTable.jsx";
import { CreateUserForm } from "./CreateUserForm.jsx";
import { ParentStudentLinkPanel } from "./ParentStudentLinkPanel.jsx";
import { RecordsTable } from "./RecordsTable.jsx";
import { RecordsTabs } from "./RecordsTabs.jsx";
import { UserEditForm } from "./UserEditForm.jsx";
import { UserProfileDrawer } from "./UserProfileDrawer.jsx";

export function AccountsRecordsPage(props) {
  const {
    staffLike,
    isInstitution,
    adminUsers,
    adminMsg,
    adminSearch,
    setAdminSearch,
    openUserDetails,
    beginEditUser,
    editUser,
    setEditUser,
    saveEditUser,
    selectedUserDetails,
    setSelectedUserDetails,
    detailsLoading,
    reviewLoading,
    reviewQueue,
    loadReviewQueue,
    decideReview,
    loadAdminUsers,
    loadLinks,
    runAlerts,
    linkStudentId,
    setLinkStudentId,
    linkParentId,
    setLinkParentId,
    linkParent,
    unlinkParent,
    links,
    departments,
    deleteUser,
  } = props;

  const [activeTab, setActiveTab] = useState("students");

  const filteredUsers = useMemo(() => {
    const q = String(adminSearch || "").trim().toLowerCase();
    if (!q) return adminUsers;
    return adminUsers.filter((u) =>
      [u.user_code, u.id, u.full_name, u.email, u.role].join(" ").toLowerCase().includes(q)
    );
  }, [adminUsers, adminSearch]);

  const students = filteredUsers.filter((u) => u.role === "student");
  const staff = filteredUsers.filter((u) => u.role === "staff" || u.role === "institution");
  const parents = filteredUsers.filter((u) => u.role === "parent");

  const handleDecision = (sessionId, decision) => {
    const note = window.prompt("Optional review note", "") ?? null;
    if (note === null) return;
    decideReview(sessionId, decision, note);
  };

  const handleOpenUser = async (userId) => {
    await openUserDetails(userId);
    setTimeout(() => {
      const drawer = document.querySelector('[data-profile-view]');
      if (drawer) drawer.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div className="space-y-5">
      {staffLike && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <RecordsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <GlobalSearchBar value={adminSearch} onChange={setAdminSearch} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={loadAdminUsers} className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">Refresh users</button>
            <button type="button" onClick={loadLinks} className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">Refresh links</button>
            <button type="button" onClick={runAlerts} className="rounded bg-rose-700 px-3 py-1.5 text-xs text-white hover:bg-rose-600">Run alerts</button>
            {isInstitution && (
              <button
                type="button"
                onClick={() => {
                  const createSection = document.querySelector('[data-create-user-form]');
                  if (createSection) createSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="rounded border border-emerald-500/60 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-900/30"
              >
                Create user
              </button>
            )}
          </div>
          {adminMsg && <p className="mt-2 text-xs text-slate-300">{adminMsg}</p>}

          {isInstitution && activeTab !== "manual-review" && (
            <div className="mt-4">
              <CreateUserForm
                isOpen={true}
                newUser={props.newUser}
                setNewUser={props.setNewUser}
                createUser={props.createUser}
                departments={departments}
              />
            </div>
          )}

          {activeTab === "students" && (
            <div className="mt-4 space-y-3">
              <RecordsTable
                title="Students"
                rows={students}
                onOpen={handleOpenUser}
                onEdit={beginEditUser}
                onDelete={deleteUser}
                showEdit={isInstitution}
              />
              <ParentStudentLinkPanel
                studentUsers={adminUsers.filter((u) => u.role === "student")}
                parentUsers={adminUsers.filter((u) => u.role === "parent")}
                linkStudentId={linkStudentId}
                setLinkStudentId={setLinkStudentId}
                linkParentId={linkParentId}
                setLinkParentId={setLinkParentId}
                linkParent={linkParent}
                links={links}
                unlinkParent={unlinkParent}
              />
            </div>
          )}

          {activeTab === "staff" && (
            <div className="mt-4">
              <RecordsTable
                title="Staff"
                rows={staff}
                onOpen={handleOpenUser}
                onEdit={beginEditUser}
                onDelete={deleteUser}
                showEdit={isInstitution}
              />
            </div>
          )}

          {activeTab === "parents" && (
            <div className="mt-4">
              <RecordsTable
                title="Parents"
                rows={parents}
                onOpen={handleOpenUser}
                onEdit={beginEditUser}
                onDelete={deleteUser}
                showEdit={isInstitution}
              />
            </div>
          )}

          {activeTab === "manual-review" && (
            <div className="mt-4">
              <ManualReviewTable
                reviewLoading={reviewLoading}
                reviewQueue={reviewQueue}
                loadReviewQueue={loadReviewQueue}
                onDecision={handleDecision}
              />
            </div>
          )}

          {isInstitution && (
            <div className="mt-4">
              <UserProfileDrawer
                details={selectedUserDetails}
                loading={detailsLoading}
                onClose={() => setSelectedUserDetails(null)}
                departments={departments}
              />
            </div>
          )}

          {isInstitution && (
            <div className="mt-4">
              <UserEditForm
                isOpen={Boolean(editUser.id)}
                editUser={editUser}
                setEditUser={setEditUser}
                saveEditUser={saveEditUser}
                departments={departments}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
