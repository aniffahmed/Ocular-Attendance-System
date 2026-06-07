import { useCallback, useEffect, useState } from "react";
import { AiModelSettingsPage } from "./components/ocular/AiModelSettingsPage.jsx";
import { AnalyticsReportsPage } from "./components/ocular/AnalyticsReportsPage.jsx";
import { ClassManagementPage } from "./components/ocular/ClassManagementPage.jsx";
import { DashboardContent } from "./components/ocular/DashboardContent.jsx";
import { LiveAttendancePage } from "./components/ocular/LiveAttendancePage.jsx";
import { OcularLayout } from "./components/ocular/OcularLayout.jsx";
import { ParentAlertsPage } from "./components/ocular/ParentAlertsPage.jsx";
import { PlaceholderPage } from "./components/ocular/PlaceholderPage.jsx";
import { StudentRecordsPage } from "./components/ocular/StudentRecordsPage.jsx";
import { SystemLogsPage } from "./components/ocular/SystemLogsPage.jsx";

const API = "http://127.0.0.1:5000";
const TOKEN_KEY = "ocular_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export default function App() {
  const [authStatus, setAuthStatus] = useState(null);
  const [token, setTokenState] = useState(getToken);
  const [user, setUser] = useState(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [bootEmail, setBootEmail] = useState("");
  const [bootPassword, setBootPassword] = useState("");
  const [bootName, setBootName] = useState("Institution Admin");

  const [attendance, setAttendance] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResult, setChatResult] = useState(null);
  const [chatError, setChatError] = useState("");

  const [regName, setRegName] = useState("");
  const [periodMinutes, setPeriodMinutes] = useState("45");
  const [requiredPercentage, setRequiredPercentage] = useState("90");
  const [mlStatus, setMlStatus] = useState(null);
  const [mlMsg, setMlMsg] = useState("");

  const [parentAlerts, setParentAlerts] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
    attendance_name: "",
    department_code: "",
  });
  const [linkStudentId, setLinkStudentId] = useState("");
  const [linkParentId, setLinkParentId] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [links, setLinks] = useState([]);
  const [editUser, setEditUser] = useState({
    id: "",
    user_code: "",
    email: "",
    full_name: "",
    attendance_name: "",
    password: "",
    role: "",
    department_code: "",
  });
  const [sessionDepartmentCode, setSessionDepartmentCode] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState("dashboard");

  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [newSection, setNewSection] = useState({
    department_code: "",
    batch_year: String(new Date().getFullYear()),
    section_name: "A",
  });
  const [timetableDraft, setTimetableDraft] = useState({});
  const [classMsg, setClassMsg] = useState("");

  const [policy, setPolicy] = useState({
    period_minutes: "45",
    required_percentage: "90",
    recognition_cooldown_seconds: "6",
    session_gap_tolerance_seconds: "20",
  });
  const [aiMsg, setAiMsg] = useState("");

  const authFetch = useCallback(
    async (path, options = {}) => {
      const headers = { ...(options.headers || {}) };
      const t = getToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      return fetch(`${API}${path}`, { ...options, headers });
    },
    []
  );

  const loadMe = useCallback(async () => {
    const res = await authFetch("/api/auth/me");
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      return true;
    }
    setToken(null);
    setTokenState(null);
    setUser(null);
    return false;
  }, [authFetch]);

  useEffect(() => {
    fetch(`${API}/api/auth/status`)
      .then((r) => r.json())
      .then(setAuthStatus)
      .catch(() => setAuthStatus({ needs_bootstrap: false }));
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    loadMe();
  }, [token, loadMe]);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/attendance");
      const data = await res.json();
      if (data.success) setAttendance(data.data || []);
      else if (res.status === 401) {
        setToken(null);
        setTokenState(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const loadReviewQueue = useCallback(async () => {
    if (!user || (user.role !== "institution" && user.role !== "staff")) {
      setReviewQueue([]);
      return;
    }
    try {
      setReviewLoading(true);
      const res = await authFetch("/api/attendance/review-queue");
      const data = await res.json();
      if (data.success) setReviewQueue(data.data || []);
      else setReviewQueue([]);
    } catch {
      setReviewQueue([]);
    } finally {
      setReviewLoading(false);
    }
  }, [authFetch, user]);

  const loadSystemLogs = useCallback(async () => {
    if (!user || (user.role !== "institution" && user.role !== "staff")) {
      setSystemLogs([]);
      return;
    }
    try {
      setLogsLoading(true);
      const res = await authFetch("/api/system/logs?limit=150");
      const data = await res.json();
      if (data.success) setSystemLogs(data.data || []);
      else setSystemLogs([]);
    } catch {
      setSystemLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [authFetch, user]);

  const loadPolicy = useCallback(async () => {
    if (!user || (user.role !== "institution" && user.role !== "staff")) return;
    try {
      const res = await authFetch("/api/attendance/policy");
      const data = await res.json();
      if (!data.success) return;
      setPolicy({
        period_minutes: String(data.policy?.period_minutes ?? 45),
        required_percentage: String(data.policy?.required_percentage ?? 90),
        recognition_cooldown_seconds: String(data.policy?.recognition_cooldown_seconds ?? 6),
        session_gap_tolerance_seconds: String(data.policy?.session_gap_tolerance_seconds ?? 20),
      });
      setPeriodMinutes(String(data.policy?.period_minutes ?? 45));
      setRequiredPercentage(String(data.policy?.required_percentage ?? 90));
    } catch {
      // Keep existing values on failure.
    }
  }, [authFetch, user]);

  const loadClassCore = useCallback(async () => {
    if (!user || (user.role !== "institution" && user.role !== "staff")) return;
    try {
      const [depRes, secRes, blkRes] = await Promise.all([
        authFetch("/api/class/departments"),
        authFetch("/api/class/sections"),
        authFetch("/api/class/schedule/blocks"),
      ]);
      const [dep, sec, blk] = await Promise.all([depRes.json(), secRes.json(), blkRes.json()]);
      if (dep.success) setDepartments(dep.data || []);
      if (sec.success) {
        setSections(sec.data || []);
        if (!selectedSectionId && sec.data?.length) setSelectedSectionId(String(sec.data[0].id));
      }
      if (blk.success) setBlocks(blk.data || []);
    } catch {
      setClassMsg("Failed to load class module data.");
    }
  }, [authFetch, selectedSectionId, user]);

  const loadTimetable = useCallback(async () => {
    if (!selectedSectionId) {
      setTimetableDraft({});
      return;
    }
    try {
      const res = await authFetch(`/api/class/sections/${selectedSectionId}/timetable`);
      const data = await res.json();
      if (!data.success) return;
      const draft = {};
      for (const r of data.data || []) {
        draft[`${r.weekday}-${r.period_number}`] = r.subject_name;
      }
      setTimetableDraft(draft);
    } catch {
      setTimetableDraft({});
    }
  }, [authFetch, selectedSectionId]);

  useEffect(() => {
    if (user) loadAttendance();
  }, [user, loadAttendance]);

  useEffect(() => {
    if (user && (user.role === "institution" || user.role === "staff")) {
      loadReviewQueue();
      loadPolicy();
      loadClassCore();
    }
  }, [user, loadReviewQueue, loadPolicy, loadClassCore]);

  useEffect(() => {
    if (page === "logs") loadSystemLogs();
  }, [page, loadSystemLogs]);

  useEffect(() => {
    if (page === "class") loadTimetable();
  }, [page, loadTimetable]);

  const loadParentAlerts = useCallback(async () => {
    const res = await authFetch("/api/parent/alerts");
    const data = await res.json();
    if (data.success) setParentAlerts(data.alerts || []);
  }, [authFetch]);

  useEffect(() => {
    if (user?.role === "parent") loadParentAlerts();
  }, [user, loadParentAlerts]);

  const loadAdminUsers = useCallback(async () => {
    const res = await authFetch("/api/admin/users");
    const data = await res.json();
    if (data.success) setAdminUsers(data.users || []);
  }, [authFetch]);

  const loadLinks = useCallback(async () => {
    const res = await authFetch("/api/admin/links");
    const data = await res.json();
    if (data.success) setLinks(data.links || []);
  }, [authFetch]);

  useEffect(() => {
    if (user && (user.role === "institution" || user.role === "staff")) loadAdminUsers();
  }, [user, loadAdminUsers]);

  useEffect(() => {
    if (user && (user.role === "institution" || user.role === "staff")) loadLinks();
  }, [user, loadLinks]);

  const isInstitution = user?.role === "institution";

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setAuthError(data.error || "Login failed");
        return;
      }
      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);
      setPage("dashboard");
    } catch {
      setAuthError("Cannot reach backend.");
    }
  };

  const handleBootstrap = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API}/api/auth/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: bootEmail,
          password: bootPassword,
          full_name: bootName,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setAuthError(data.error || "Bootstrap failed");
        return;
      }
      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);
      setAuthStatus({ needs_bootstrap: false, user_count: 1 });
      setPage("dashboard");
    } catch {
      setAuthError("Cannot reach backend.");
    }
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setPage("dashboard");
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setChatLoading(true);
    setChatError("");
    setChatResult(null);
    try {
      const res = await authFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!data.success) setChatError(data.error || "Chat failed");
      else setChatResult(data);
    } catch {
      setChatError("Failed to reach backend.");
    } finally {
      setChatLoading(false);
    }
  };

  const pollMlStatus = useCallback(async () => {
    try {
      const res = await authFetch("/api/ml/status");
      const data = await res.json();
      if (data.success) setMlStatus(data);
    } catch {
      setMlStatus(null);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!user || (user.role !== "institution" && user.role !== "staff")) return;
    pollMlStatus();
    const id = setInterval(pollMlStatus, 2000);
    return () => clearInterval(id);
  }, [user, pollMlStatus]);

  useEffect(() => {
    if (!user || (user.role !== "institution" && user.role !== "staff")) return;
    if (!mlStatus?.session_running) return;
    const id = setInterval(() => {
      loadAttendance();
      loadReviewQueue();
    }, 5000);
    return () => clearInterval(id);
  }, [user, mlStatus?.session_running, loadAttendance, loadReviewQueue]);

  const postMl = async (path, body) => {
    setMlMsg("");
    try {
      const res = await authFetch(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : "{}",
      });
      const data = await res.json();
      setMlMsg(data.message || data.error || JSON.stringify(data));
      pollMlStatus();
      if (path === "/api/stop_session" || path === "/api/stop_capture") loadAttendance();
    } catch {
      setMlMsg("Backend unreachable.");
    }
  };

  const staffLike = user && (user.role === "institution" || user.role === "staff");

  const createUser = async (e) => {
    e.preventDefault();
    setAdminMsg("");
    const body = {
      email: newUser.email,
      password: newUser.password,
      full_name: newUser.full_name,
      role: newUser.role,
      department_code: newUser.department_code || null,
    };
    if (newUser.role === "student") body.attendance_name = newUser.attendance_name;
    const res = await authFetch("/api/users", { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    setAdminMsg(data.success ? "User created." : data.error || "Failed");
    if (data.success) {
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        role: "student",
        attendance_name: "",
        department_code: "",
      });
      await loadAdminUsers();
    }
  };

  const linkParent = async (e) => {
    e.preventDefault();
    setAdminMsg("");
    const studentId = Number(linkStudentId);
    const parentId = Number(linkParentId);
    if (!Number.isInteger(studentId) || !Number.isInteger(parentId)) {
      setAdminMsg("Select valid student and parent users.");
      return;
    }
    const res = await authFetch("/api/link-parent", {
      method: "POST",
      body: JSON.stringify({
        student_user_id: studentId,
        parent_user_id: parentId,
      }),
    });
    const data = await res.json();
    setAdminMsg(data.success ? data.message || "Linked." : data.error || "Failed");
    if (data.success) {
      setLinkStudentId("");
      setLinkParentId("");
      await loadLinks();
    }
  };

  const unlinkParent = async (studentUserId, parentUserId) => {
    setAdminMsg("");
    const res = await authFetch("/api/link-parent", {
      method: "DELETE",
      body: JSON.stringify({
        student_user_id: Number(studentUserId),
        parent_user_id: Number(parentUserId),
      }),
    });
    const data = await res.json();
    setAdminMsg(data.success ? data.message || "Unlinked." : data.error || "Failed");
    if (data.success) {
      await loadLinks();
    }
  };

  const beginEditUser = (u) => {
    setEditUser({
      id: String(u.id),
      user_code: u.user_code || "",
      email: u.email || "",
      full_name: u.full_name || "",
      attendance_name: u.attendance_name || "",
      password: "",
      role: u.role || "",
      department_code: u.department_code || "",
    });
    setTimeout(() => {
      const editSection = document.querySelector("[data-edit-form]");
      if (editSection) editSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const saveEditUser = async (e) => {
    e.preventDefault();
    if (!editUser.id) {
      setAdminMsg("Select an account to edit.");
      return;
    }
    const body = {
      user_code: String(editUser.user_code || "").trim().toUpperCase(),
      email: String(editUser.email || "").trim().toLowerCase(),
      full_name: String(editUser.full_name || "").trim(),
      role: String(editUser.role || "").trim().toLowerCase(),
      attendance_name: String(editUser.attendance_name || "").trim(),
      password: String(editUser.password || ""),
      department_code: String(editUser.department_code || "").trim().toUpperCase() || null,
    };
    if (!body.email || !body.user_code) {
      setAdminMsg("User ID and Email are required.");
      return;
    }
    const res = await authFetch(`/api/admin/users/${editUser.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setAdminMsg(data.success ? "User updated." : data.error || "Failed");
    if (data.success) {
      const editedId = Number(editUser.id);
      setEditUser({
        id: "",
        user_code: "",
        email: "",
        full_name: "",
        attendance_name: "",
        password: "",
        role: "",
        department_code: "",
      });
      await loadAdminUsers();
      await loadLinks();
      if (selectedUserDetails?.user?.id === editedId) {
        setSelectedUserDetails(null);
      }
    }
  };

  const deleteUser = async (userId) => {
    const numericId = Number(userId);
    if (!Number.isInteger(numericId)) {
      setAdminMsg("Invalid user selected for deletion.");
      return;
    }
    setAdminMsg("");
    const res = await authFetch(`/api/admin/users/${numericId}`, {
      method: "DELETE",
      body: "{}",
    });
    const data = await res.json();
    setAdminMsg(data.success ? "User deleted." : data.error || "Failed to delete user.");
    if (!data.success) return;

    if (Number(editUser.id) === numericId) {
      setEditUser({
        id: "",
        user_code: "",
        email: "",
        full_name: "",
        attendance_name: "",
        password: "",
        role: "",
        department_code: "",
      });
    }
    if (selectedUserDetails?.user?.id === numericId) {
      setSelectedUserDetails(null);
    }

    await Promise.all([loadAdminUsers(), loadLinks()]);
  };

  const openUserDetails = async (userId) => {
    setDetailsLoading(true);
    setSelectedUserDetails(null);
    try {
      const res = await authFetch(`/api/admin/users/${userId}/details`);
      const data = await res.json();
      if (!data.success) {
        setAdminMsg(data.error || "Unable to load user details.");
        return;
      }
      setSelectedUserDetails(data);
    } catch {
      setAdminMsg("Unable to load user details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const runAlerts = async () => {
    setAdminMsg("");
    const res = await authFetch("/api/admin/check-alerts", { method: "POST", body: "{}" });
    const data = await res.json();
    setAdminMsg(
      data.success ? `Alerts run: ${data.generated} mock email(s) generated.` : data.error || "Failed"
    );
    if (user?.role === "parent") loadParentAlerts();
  };

  const decideReview = async (sessionId, decision, note = "") => {
    if (!sessionId || !decision) return;
    try {
      const res = await authFetch(`/api/attendance/review/${sessionId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, note }),
      });
      const data = await res.json();
      setAdminMsg(data.success ? `Review updated: ${decision}.` : data.error || "Failed to update review.");
      if (data.success) {
        await Promise.all([loadAttendance(), loadReviewQueue()]);
      }
    } catch {
      setAdminMsg("Backend unreachable.");
    }
  };

  const createSection = async (e) => {
    e.preventDefault();
    setClassMsg("");
    try {
      const res = await authFetch("/api/class/sections", {
        method: "POST",
        body: JSON.stringify({
          department_code: newSection.department_code,
          batch_year: parseInt(newSection.batch_year, 10),
          section_name: newSection.section_name,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setClassMsg(data.error || "Failed to create section.");
        return;
      }
      setClassMsg("Section created.");
      await loadClassCore();
    } catch {
      setClassMsg("Backend unreachable.");
    }
  };

  const saveTimetable = async () => {
    if (!selectedSectionId) return;
    const entries = Object.entries(timetableDraft)
      .filter(([, subject]) => String(subject || "").trim())
      .map(([key, subject]) => {
        const [weekday, periodNumber] = key.split("-");
        return {
          weekday: parseInt(weekday, 10),
          period_number: parseInt(periodNumber, 10),
          subject_name: String(subject).trim(),
        };
      });

    setClassMsg("");
    try {
      const res = await authFetch(`/api/class/sections/${selectedSectionId}/timetable`, {
        method: "PUT",
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!data.success) {
        setClassMsg(data.error || "Failed to save timetable.");
        return;
      }
      setClassMsg(`Timetable saved (${data.count || 0} entries).`);
      await loadTimetable();
    } catch {
      setClassMsg("Backend unreachable.");
    }
  };

  const savePolicy = async () => {
    setAiMsg("");
    try {
      const res = await authFetch("/api/attendance/policy", {
        method: "PUT",
        body: JSON.stringify({
          period_minutes: Number(policy.period_minutes),
          required_percentage: Number(policy.required_percentage),
          recognition_cooldown_seconds: Number(policy.recognition_cooldown_seconds),
          session_gap_tolerance_seconds: Number(policy.session_gap_tolerance_seconds),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setAiMsg(data.error || "Failed to save policy.");
        return;
      }
      setAiMsg("Policy saved.");
      await loadPolicy();
      setPeriodMinutes(String(data.policy?.period_minutes ?? policy.period_minutes));
      setRequiredPercentage(String(data.policy?.required_percentage ?? policy.required_percentage));
    } catch {
      setAiMsg("Backend unreachable.");
    }
  };

  const pageTitle = () => {
    const m = {
      dashboard: "Ocular Dashboard",
      live: "Live attendance",
      records: user?.role === "student" ? "My attendance" : "Accounts & records",
      class: "Class management",
      analytics: "Analytics reports",
      ai: "AI model settings",
      logs: "System logs",
      alerts: "Parent alerts",
    };
    return m[page] || "Ocular";
  };

  const renderMain = () => {
    switch (page) {
      case "dashboard":
        return (
          <DashboardContent
            attendance={attendance}
            reviewQueue={reviewQueue}
            loading={loading}
            loadAttendance={loadAttendance}
            staffLike={staffLike}
            mlStatus={mlStatus}
            adminUsers={adminUsers}
            question={question}
            setQuestion={setQuestion}
            handleAsk={handleAsk}
            chatLoading={chatLoading}
            chatError={chatError}
            chatResult={chatResult}
            postMl={postMl}
            setPage={setPage}
          />
        );
      case "live":
        return staffLike ? (
          <LiveAttendancePage
            regName={regName}
            setRegName={setRegName}
            postMl={postMl}
            mlStatus={mlStatus}
            mlMsg={mlMsg}
            periodMinutes={periodMinutes}
            setPeriodMinutes={setPeriodMinutes}
            requiredPercentage={requiredPercentage}
            setRequiredPercentage={setRequiredPercentage}
            departments={departments}
            sessionDepartmentCode={sessionDepartmentCode}
            setSessionDepartmentCode={setSessionDepartmentCode}
          />
        ) : (
          <PlaceholderPage title="Live attendance" subtitle="Available to staff and institution accounts." />
        );
      case "records":
        return (
          <StudentRecordsPage
            attendance={attendance}
            reviewQueue={reviewQueue}
            reviewLoading={reviewLoading}
            loading={loading}
            loadAttendance={loadAttendance}
            loadReviewQueue={loadReviewQueue}
            decideReview={decideReview}
            staffLike={staffLike}
            isInstitution={isInstitution}
            newUser={newUser}
            setNewUser={setNewUser}
            createUser={createUser}
            linkStudentId={linkStudentId}
            setLinkStudentId={setLinkStudentId}
            linkParentId={linkParentId}
            setLinkParentId={setLinkParentId}
            linkParent={linkParent}
            unlinkParent={unlinkParent}
            loadAdminUsers={loadAdminUsers}
            links={links}
            loadLinks={loadLinks}
            beginEditUser={beginEditUser}
            editUser={editUser}
            setEditUser={setEditUser}
            saveEditUser={saveEditUser}
            runAlerts={runAlerts}
            adminMsg={adminMsg}
            adminUsers={adminUsers}
            adminSearch={adminSearch}
            setAdminSearch={setAdminSearch}
            openUserDetails={openUserDetails}
            selectedUserDetails={selectedUserDetails}
            setSelectedUserDetails={setSelectedUserDetails}
            detailsLoading={detailsLoading}
            departments={departments}
            deleteUser={deleteUser}
          />
        );
      case "alerts":
        return (
          <ParentAlertsPage parentAlerts={parentAlerts} loadParentAlerts={loadParentAlerts} />
        );
      case "class":
        return staffLike ? (
          <ClassManagementPage
            authFetch={authFetch}
            departments={departments}
            sections={sections}
            blocks={blocks}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            newSection={newSection}
            setNewSection={setNewSection}
            createSection={createSection}
            timetableDraft={timetableDraft}
            setTimetableDraft={setTimetableDraft}
            saveTimetable={saveTimetable}
            classMsg={classMsg}
          />
        ) : (
          <PlaceholderPage title="Class management" subtitle="Staff access only." />
        );
      case "analytics":
        return <AnalyticsReportsPage attendance={attendance} />;
      case "ai":
        return staffLike ? (
          <AiModelSettingsPage
            policy={policy}
            setPolicy={setPolicy}
            savePolicy={savePolicy}
            loadPolicy={loadPolicy}
            mlStatus={mlStatus}
            postMl={postMl}
            refreshMlStatus={pollMlStatus}
            aiMsg={aiMsg}
          />
        ) : (
          <PlaceholderPage title="AI model settings" subtitle="Staff access only." />
        );
      case "logs":
        return staffLike ? (
          <SystemLogsPage
            logs={systemLogs}
            logsLoading={logsLoading}
            loadSystemLogs={loadSystemLogs}
          />
        ) : (
          <PlaceholderPage title="System logs" subtitle="Staff access only." />
        );
      default:
        return <PlaceholderPage title="Ocular" />;
    }
  };

  if (!token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">Ocular</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in (Phase 2 — JWT)</p>

          {authStatus?.needs_bootstrap && (
            <form onSubmit={handleBootstrap} className="mt-6 space-y-3 border-b border-slate-200 pb-6">
              <p className="text-sm font-medium text-amber-800">First-time setup: create Institution account</p>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Institution admin email"
                value={bootEmail}
                onChange={(e) => setBootEmail(e.target.value)}
                type="email"
                required
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Password"
                type="password"
                value={bootPassword}
                onChange={(e) => setBootPassword(e.target.value)}
                required
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Full name"
                value={bootName}
                onChange={(e) => setBootName(e.target.value)}
              />
              <button type="submit" className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-700">
                Create institution &amp; sign in
              </button>
            </form>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button type="submit" className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Sign in
            </button>
          </form>
          {authError && <p className="mt-3 text-sm text-red-600">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <OcularLayout
      user={user}
      logout={logout}
      activeId={page}
      onNavigate={setPage}
      title={pageTitle()}
    >
      {renderMain()}
    </OcularLayout>
  );
}
