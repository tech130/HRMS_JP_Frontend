import React, { useState, useEffect, useMemo } from "react";
import {
    Modal,
    Button,
    Upload,
    Table,
    Tag,
    message,
    Input,
    Select,
    Space,
} from "antd";
import {
    DownloadOutlined,
    UploadOutlined,
    FileExcelOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CheckCircleFilled,
    PlusOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    CopyOutlined,
    LinkOutlined,
    ReloadOutlined,
    EyeOutlined,
    CrownOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { TextArea } = Input;
const BASE_URL = import.meta.env.VITE_BASE_URL;

function authHeaders(): HeadersInit {
    try {
        const raw = localStorage.getItem("task_tracker_auth");
        if (!raw) return {};
        const { token } = JSON.parse(raw);
        return token ? { Authorization: `Token ${token}` } : {};
    } catch {
        return {};
    }
}

export interface SheetMemberRow {
    key: string;
    employee_id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    reporting_to: string;
    password?: string;
    is_active: boolean;
}

export interface ParsedMember {
    key: string;
    employee_id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    reporting_to: string;
    password?: string;
    is_active: boolean;
    isValid: boolean;
    errorMsg?: string;
}

interface ExistingMember {
    id: number;
    employee_id?: string;
    name: string;
    email: string;
    role?: string;
    department?: string;
}

interface TeamLead {
    id: number;
    employee_id?: string;
    name: string;
    email: string;
}

interface BulkUploadTeamModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    departments?: string[];
    existingMembers?: ExistingMember[];
    teamLeads?: TeamLead[];
}

export default function BulkUploadTeamModal({
    open,
    onClose,
    onSuccess,
    departments: propDepartments = [],
    existingMembers: propExistingMembers = [],
    teamLeads: propTeamLeads = [],
}: BulkUploadTeamModalProps) {
    const [viewMode, setViewMode] = useState<"sheet" | "preview">("sheet");
    const [sheetRows, setSheetRows] = useState<SheetMemberRow[]>([]);
    const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [uploading, setUploading] = useState(false);

    // Dynamic departments and TLs fallback
    const [departmentsList, setDepartmentsList] = useState<string[]>(propDepartments);
    const [tlList, setTlList] = useState<TeamLead[]>(propTeamLeads);
    const [existingList, setExistingList] = useState<ExistingMember[]>(propExistingMembers);

    // Modals for external data insertion
    const [pasteModalOpen, setPasteModalOpen] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [sheetUrl, setSheetUrl] = useState("");
    const [fetchingUrl, setFetchingUrl] = useState(false);

    // Sync props or fetch if empty
    useEffect(() => {
        if (propDepartments && propDepartments.length > 0) {
            setDepartmentsList(propDepartments);
        } else if (open) {
            fetch(`${BASE_URL}/api/auth/departments/`, { headers: authHeaders() })
                .then((r) => (r.ok ? r.json() : []))
                .then((data) => {
                    if (Array.isArray(data)) setDepartmentsList(data);
                })
                .catch(() => {});
        }
    }, [propDepartments, open]);

    useEffect(() => {
        if (propTeamLeads && propTeamLeads.length > 0) {
            setTlList(propTeamLeads);
        }
    }, [propTeamLeads]);

    useEffect(() => {
        if (propExistingMembers && propExistingMembers.length > 0) {
            setExistingList(propExistingMembers);
        } else if (open) {
            fetch(`${BASE_URL}/api/auth/employees/`, { headers: authHeaders() })
                .then((r) => (r.ok ? r.json() : []))
                .then((data) => {
                    if (Array.isArray(data)) {
                        setExistingList(data);
                        const tls = data.filter(
                            (e: any) =>
                                e.role &&
                                (e.role.trim().toUpperCase() === "TL" ||
                                    e.role.trim().toUpperCase() === "TEAM LEAD")
                        );
                        setTlList(tls);
                    }
                })
                .catch(() => {});
        }
    }, [propExistingMembers, open]);

    // Initial dummy sample rows matching requested style
    const getInitialSampleRows = (): SheetMemberRow[] => {
        const defaultDept = departmentsList[0] || "Tech";
        return [
            {
                key: `row-${Date.now()}-1`,
                employee_id: "TM-101",
                name: "Priyanka Patel",
                email: "priyanka.tl@company.com",
                department: defaultDept,
                role: "TL",
                reporting_to: "Admin",
                password: "Welcome@123",
                is_active: true,
            },
            {
                key: `row-${Date.now()}-2`,
                employee_id: "TM-102",
                name: "Arun Kumar",
                email: "arun.dev@company.com",
                department: defaultDept,
                role: "Employee",
                reporting_to: "Priyanka Patel",
                password: "Welcome@123",
                is_active: true,
            },
        ];
    };

    // Initialize or reset sample rows whenever modal opens
    useEffect(() => {
        if (open) {
            setViewMode("sheet");
            setSheetRows(getInitialSampleRows());
            setParsedMembers([]);
            setSelectedRowKeys([]);
        }
    }, [open]);

    // ─────────────────────────────────────────────────────────────
    // Sheet Row Manipulation
    // ─────────────────────────────────────────────────────────────
    const handleAddRow = () => {
        const defaultDept = departmentsList[0] || "";
        const nextIdNumber = sheetRows.length + 101;
        const newRow: SheetMemberRow = {
            key: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            employee_id: `TM-${nextIdNumber}`,
            name: "",
            email: "",
            department: defaultDept,
            role: "Employee",
            reporting_to: "Admin",
            password: "Welcome@123",
            is_active: true,
        };
        setSheetRows((prev) => [...prev, newRow]);
    };

    const handleUpdateRow = (key: string, field: keyof SheetMemberRow, value: any) => {
        setSheetRows((prev) =>
            prev.map((r) => {
                if (r.key !== key) return r;
                const updated = { ...r, [field]: value };

                // If Role is set to TL, reporting_to must be Admin
                if (field === "role") {
                    const isTL = String(value).trim().toUpperCase() === "TL" || String(value).trim().toUpperCase() === "TEAM LEAD";
                    if (isTL) {
                        updated.reporting_to = "Admin";
                    }
                }
                return updated;
            })
        );
    };

    const handleDeleteRow = (key: string) => {
        setSheetRows((prev) => prev.filter((r) => r.key !== key));
    };

    const handleResetSampleData = () => {
        setSheetRows(getInitialSampleRows());
        message.info("Reset to dummy sample team member data");
    };

    // ─────────────────────────────────────────────────────────────
    // Validate Sheet Data & Switch to Preview Mode
    // ─────────────────────────────────────────────────────────────
    const handleValidateAndPreview = () => {
        if (sheetRows.length === 0) {
            message.warning("Please add at least one team member row in the sheet.");
            return;
        }

        const existingEmails = new Set(existingList.map((e) => (e.email || "").trim().toLowerCase()));
        const existingIds = new Set(
            existingList
                .map((e) => (e.employee_id ? String(e.employee_id).trim().toLowerCase() : ""))
                .filter(Boolean)
        );

        const seenEmailsInSheet = new Set<string>();
        const seenIdsInSheet = new Set<string>();

        const members: ParsedMember[] = sheetRows.map((row) => {
            const empId = (row.employee_id || "").trim();
            const name = (row.name || "").trim();
            const email = (row.email || "").trim();
            const department = (row.department || "").trim();
            const role = (row.role || "Employee").trim();
            const isTL = role.toUpperCase() === "TL" || role.toUpperCase() === "TEAM LEAD";
            const reportingTo = isTL ? "Admin" : (row.reporting_to || "Admin").trim();
            const password = (row.password || "").trim();
            const isActive = Boolean(row.is_active);

            let isValid = true;
            let errorMsg = "";

            if (!empId) {
                isValid = false;
                errorMsg = "Member ID is required";
            } else if (!name) {
                isValid = false;
                errorMsg = "Full Name is required";
            } else if (!email) {
                isValid = false;
                errorMsg = "Email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                isValid = false;
                errorMsg = `Invalid email address format: "${email}"`;
            } else if (seenIdsInSheet.has(empId.toLowerCase())) {
                isValid = false;
                errorMsg = `Duplicate Member ID "${empId}" in sheet`;
            } else if (seenEmailsInSheet.has(email.toLowerCase())) {
                isValid = false;
                errorMsg = `Duplicate email "${email}" in sheet`;
            } else if (existingIds.has(empId.toLowerCase())) {
                isValid = false;
                errorMsg = `Member ID "${empId}" already exists in system`;
            } else if (existingEmails.has(email.toLowerCase())) {
                isValid = false;
                errorMsg = `Email "${email}" already registered in system`;
            }

            if (empId) seenIdsInSheet.add(empId.toLowerCase());
            if (email) seenEmailsInSheet.add(email.toLowerCase());

            return {
                key: row.key,
                employee_id: empId,
                name,
                email,
                department,
                role: isTL ? "TL" : role,
                reporting_to: reportingTo,
                password: password || undefined,
                is_active: isActive,
                isValid,
                errorMsg,
            };
        });

        setParsedMembers(members);
        const validKeys = members.filter((m) => m.isValid).map((m) => m.key);
        setSelectedRowKeys(validKeys);
        setViewMode("preview");
    };

    // ─────────────────────────────────────────────────────────────
    // Direct Paste from Google Sheets / Excel (TSV / CSV)
    // ─────────────────────────────────────────────────────────────
    const handlePasteImport = () => {
        if (!pasteText.trim()) {
            message.warning("Please paste some spreadsheet data first.");
            return;
        }

        const lines = pasteText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) {
            message.warning("No data found in pasted text.");
            return;
        }

        const newRows: SheetMemberRow[] = [];

        lines.forEach((line, idx) => {
            const cols = line.includes("\t") ? line.split("\t") : line.split(",");
            const cleanCols = cols.map((c) => c.trim().replace(/^"|"$/g, ""));

            const lower0 = cleanCols[0]?.toLowerCase() || "";
            const lower1 = cleanCols[1]?.toLowerCase() || "";
            const lower2 = cleanCols[2]?.toLowerCase() || "";

            // Skip header row if detected
            if (
                idx === 0 &&
                (lower0.includes("id") || lower1.includes("name") || lower2.includes("email") || lower0.includes("member"))
            ) {
                return;
            }

            const empId = cleanCols[0] || `TM-${100 + sheetRows.length + idx + 1}`;
            const name = cleanCols[1] || "";
            if (!name && !cleanCols[2]) return;

            const email = cleanCols[2] || "";
            const dept = cleanCols[3] || departmentsList[0] || "";
            const rawRole = cleanCols[4] || "Employee";
            const isTL = rawRole.trim().toUpperCase() === "TL" || rawRole.trim().toUpperCase() === "TEAM LEAD";
            const role = isTL ? "TL" : rawRole;
            const reportingTo = isTL ? "Admin" : (cleanCols[5] || "Admin");
            const pwd = cleanCols[6] || "Welcome@123";
            const activeRaw = (cleanCols[7] || "true").toLowerCase();
            const isActive = !["false", "0", "no", "inactive"].includes(activeRaw);

            newRows.push({
                key: `paste-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                employee_id: empId,
                name,
                email,
                department: dept,
                role,
                reporting_to: reportingTo,
                password: pwd,
                is_active: isActive,
            });
        });

        if (newRows.length === 0) {
            message.warning("Could not parse rows from pasted text.");
            return;
        }

        setSheetRows((prev) => [...prev, ...newRows]);
        setPasteText("");
        setPasteModalOpen(false);
        message.success(`Successfully added ${newRows.length} team member(s) from clipboard!`);
    };

    // ─────────────────────────────────────────────────────────────
    // Import via Google Sheet URL
    // ─────────────────────────────────────────────────────────────
    const handleGoogleSheetLinkImport = async () => {
        if (!sheetUrl.trim()) {
            message.warning("Please enter a Google Sheet URL.");
            return;
        }

        const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match || !match[1]) {
            message.error("Invalid Google Sheet link. It should look like: https://docs.google.com/spreadsheets/d/.../edit");
            return;
        }

        const sheetId = match[1];
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;

        setFetchingUrl(true);
        try {
            const resp = await fetch(csvUrl);
            if (!resp.ok) {
                throw new Error("Failed to fetch sheet data. Make sure the Google Sheet is shared as 'Anyone with link can view'.");
            }
            const csvText = await resp.text();
            const workbook = XLSX.read(csvText, { type: "string" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            if (rawRows.length === 0) {
                message.warning("Google Sheet was loaded but no data rows were found.");
                return;
            }

            const newRows: SheetMemberRow[] = rawRows.map((r, i) => {
                const empId = String(r["Member ID"] || r["Employee ID"] || r["employee_id"] || r["ID"] || Object.values(r)[0] || "").trim();
                const name = String(r["Full Name"] || r["Name"] || r["name"] || Object.values(r)[1] || "").trim();
                const email = String(r["Email"] || r["email"] || Object.values(r)[2] || "").trim();
                const dept = String(r["Department"] || r["department"] || Object.values(r)[3] || "").trim();
                const rawRole = String(r["Role"] || r["role"] || Object.values(r)[4] || "Employee").trim();
                const isTL = rawRole.toUpperCase() === "TL" || rawRole.toUpperCase() === "TEAM LEAD";
                const role = isTL ? "TL" : rawRole;
                const reportingTo = isTL ? "Admin" : String(r["Reporting To"] || r["reporting_to"] || Object.values(r)[5] || "Admin").trim();
                const pwd = String(r["Password"] || r["password"] || Object.values(r)[6] || "Welcome@123").trim();
                const activeRaw = String(r["Is Active"] || r["is_active"] || r["Status"] || "true").toLowerCase();
                const isActive = !["false", "0", "no", "inactive"].includes(activeRaw);

                return {
                    key: `gsheet-${Date.now()}-${i}`,
                    employee_id: empId || `TM-${200 + i}`,
                    name,
                    email,
                    department: dept || departmentsList[0] || "",
                    role: role || "Employee",
                    reporting_to: reportingTo || "Admin",
                    password: pwd,
                    is_active: isActive,
                };
            });

            setSheetRows(newRows);
            setLinkModalOpen(false);
            setSheetUrl("");
            message.success(`Successfully imported ${newRows.length} team member row(s) from Google Sheet!`);
        } catch (err: any) {
            message.error(err.message || "Failed to load Google Sheet. Ensure sheet permission is 'Anyone with link can view'.");
        } finally {
            setFetchingUrl(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // File Parse (XLSX / CSV file upload)
    // ─────────────────────────────────────────────────────────────
    const handleFileParse = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                if (rawRows.length === 0) {
                    message.error("The uploaded file contains no data rows.");
                    return;
                }

                const newRows: SheetMemberRow[] = rawRows.map((row, idx) => {
                    const empId = String(row["Member ID"] || row["Employee ID"] || row["employee_id"] || row["ID"] || "").trim();
                    const name = String(row["Full Name"] || row["Name"] || row["name"] || "").trim();
                    const email = String(row["Email"] || row["email"] || "").trim();
                    const dept = String(row["Department"] || row["Dept"] || row["department"] || "").trim();
                    const rawRole = String(row["Role"] || row["role"] || "Employee").trim();
                    const isTL = rawRole.toUpperCase() === "TL" || rawRole.toUpperCase() === "TEAM LEAD";
                    const role = isTL ? "TL" : rawRole;
                    const reportingTo = isTL ? "Admin" : String(row["Reporting To"] || row["reporting_to"] || "Admin").trim();
                    const pwd = String(row["Password"] || row["password"] || "Welcome@123").trim();
                    const activeRaw = String(row["Is Active"] || row["Status"] || "true").toLowerCase();
                    const isActive = !["false", "0", "no", "inactive"].includes(activeRaw);

                    return {
                        key: `file-${Date.now()}-${idx}`,
                        employee_id: empId || `TM-${100 + idx}`,
                        name,
                        email,
                        department: dept || departmentsList[0] || "",
                        role: role || "Employee",
                        reporting_to: reportingTo || "Admin",
                        password: pwd,
                        is_active: isActive,
                    };
                });

                setSheetRows(newRows);
                message.success(`Loaded ${newRows.length} team members into Google Sheet Editor!`);
            } catch {
                message.error("Failed to read file.");
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    // ─────────────────────────────────────────────────────────────
    // Download Sample Template (.xlsx)
    // ─────────────────────────────────────────────────────────────
    const handleDownloadTemplate = () => {
        const headers = [
            "Member ID",
            "Full Name",
            "Email",
            "Department",
            "Role",
            "Reporting To",
            "Password",
            "Is Active",
        ];

        const sampleRows = [
            [
                "TM-101",
                "Priyanka Patel",
                "priyanka.tl@company.com",
                departmentsList[0] || "Tech",
                "TL",
                "Admin",
                "Welcome@123",
                "true",
            ],
            [
                "TM-102",
                "Arun Kumar",
                "arun.dev@company.com",
                departmentsList[0] || "Tech",
                "Employee",
                "Priyanka Patel",
                "Welcome@123",
                "true",
            ],
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Team Members Template");
        XLSX.writeFile(wb, "team_members_bulk_upload_template.xlsx");
        message.success("Standard team members template downloaded successfully");
    };

    // ─────────────────────────────────────────────────────────────
    // Confirm & Bulk Create Selected Team Members
    // ─────────────────────────────────────────────────────────────
    const handleConfirmCreate = async () => {
        const selectedMembers = parsedMembers.filter(
            (m) => selectedRowKeys.includes(m.key) && m.isValid
        );

        if (selectedMembers.length === 0) {
            message.warning("No valid team members selected to create. Please select at least one valid row.");
            return;
        }

        setUploading(true);

        const payload = {
            employees: selectedMembers.map((m) => ({
                employee_id: m.employee_id,
                name: m.name,
                email: m.email,
                department: m.department,
                role: m.role,
                reporting_to: m.reporting_to,
                password: m.password,
                is_active: m.is_active,
            })),
        };

        try {
            const res = await fetch(`${BASE_URL}/api/auth/employees/bulk-create/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const createdCount = data.created_count ?? selectedMembers.length;
                message.success(`Successfully added ${createdCount} team member(s)!`);
                if (data.errors && data.errors.length > 0) {
                    message.warning(`${data.errors.length} row(s) had server validation warnings.`);
                }
                onSuccess();
                handleClose();
            } else {
                const errMsg =
                    data.detail ||
                    (data.errors && data.errors.map((e: any) => `Row ${e.row}: ${e.error}`).join("; ")) ||
                    "Failed to bulk upload team members";
                message.error(errMsg);
            }
        } catch {
            message.error("Network error during bulk creation.");
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setViewMode("sheet");
        setParsedMembers([]);
        setSelectedRowKeys([]);
        onClose();
    };

    const validCount = parsedMembers.filter((m) => m.isValid).length;
    const invalidCount = parsedMembers.length - validCount;

    // Reporting To options: "Admin" + all known TLs + TL rows currently in the sheet
    const reportingOptions = useMemo(() => {
        const opts = [{ value: "Admin", label: "👑 Direct to Admin" }];

        // Add TLs from existing DB
        tlList.forEach((tl) => {
            opts.push({
                value: tl.name,
                label: `TL: ${tl.name} (${tl.email})`,
            });
        });

        // Add any row in current sheet that has role "TL"
        sheetRows.forEach((r) => {
            if (r.name && (r.role.toUpperCase() === "TL" || r.role.toUpperCase() === "TEAM LEAD")) {
                if (!opts.some((o) => o.value.toLowerCase() === r.name.toLowerCase())) {
                    opts.push({
                        value: r.name,
                        label: `TL: ${r.name} (in sheet)`,
                    });
                }
            }
        });

        return opts;
    }, [tlList, sheetRows]);

    const departmentOptions = useMemo(
        () => departmentsList.map((d) => ({ value: d, label: d })),
        [departmentsList]
    );

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "#0F9D58",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                        }}
                    >
                        <FileExcelOutlined style={{ fontSize: 16 }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>
                            {viewMode === "sheet" ? "Google Sheet - Bulk Team Member Editor" : "Bulk Upload Team Members"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>
                            {viewMode === "sheet"
                                ? "Edit dummy sample data, add more rows, or paste from Google Sheets"
                                : "Review and selectively create validated team members"}
                        </div>
                    </div>
                </div>
            }
            width={viewMode === "sheet" ? 1160 : 920}
            centered
            destroyOnClose
            footer={
                viewMode === "sheet"
                    ? [
                          <Button key="cancel" onClick={handleClose}>
                              Cancel
                          </Button>,
                          <Button
                              key="validate"
                              type="primary"
                              icon={<EyeOutlined />}
                              onClick={handleValidateAndPreview}
                              style={{ background: "#0F9D58", borderColor: "#0F9D58", fontWeight: 600, height: 36 }}
                          >
                              Save & Preview Team Members ({sheetRows.length} rows) →
                          </Button>,
                      ]
                    : [
                          <Button
                              key="back"
                              icon={<ArrowLeftOutlined />}
                              onClick={() => setViewMode("sheet")}
                          >
                              Back to Sheet / Edit
                          </Button>,
                          <Button key="cancel" onClick={handleClose}>
                              Cancel
                          </Button>,
                          <Button
                              key="submit"
                              type="primary"
                              loading={uploading}
                              disabled={selectedRowKeys.length === 0}
                              onClick={handleConfirmCreate}
                              style={{ background: "#1B3363", borderColor: "#1B3363", fontWeight: 600, height: 36 }}
                          >
                              Create {selectedRowKeys.length} Team Members
                          </Button>,
                      ]
            }
        >
            {/* ══════════════════════════════════════════════════════════════════
                MODE 1: Google Sheet Editable Grid (Matches Screenshot)
               ══════════════════════════════════════════════════════════════════ */}
            {viewMode === "sheet" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Top Google Sheet Control Banner */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 10,
                            padding: "10px 14px",
                            background: "#F0FDF4",
                            border: "1px solid #BBF7D0",
                            borderRadius: 8,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Tag color="success" style={{ fontWeight: 600, fontSize: 11, borderRadius: 4, margin: 0 }}>
                                Google Sheet Grid
                            </Tag>
                            <span style={{ fontSize: 12, color: "#166534" }}>
                                <b>{sheetRows.length}</b> team member rows loaded. Edit cells directly, add rows, or copy-paste from Google Sheets.
                            </span>
                        </div>

                        <Space wrap size={8}>
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={handleAddRow}
                                type="primary"
                                style={{ background: "#0F9D58", borderColor: "#0F9D58", fontWeight: 600 }}
                            >
                                Add Row
                            </Button>
                            <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => setPasteModalOpen(true)}
                                style={{ borderColor: "#86EFAC", color: "#166534", fontWeight: 500 }}
                            >
                                Paste from Google Sheets
                            </Button>
                            <Button
                                size="small"
                                icon={<LinkOutlined />}
                                onClick={() => setLinkModalOpen(true)}
                                style={{ borderColor: "#86EFAC", color: "#166534", fontWeight: 500 }}
                            >
                                Google Sheet Link
                            </Button>
                            <Upload
                                accept=".xlsx, .xls, .csv"
                                beforeUpload={handleFileParse}
                                showUploadList={false}
                            >
                                <Button size="small" icon={<UploadOutlined />}>
                                    Upload File
                                </Button>
                            </Upload>
                            <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                onClick={handleResetSampleData}
                                title="Reset to initial dummy sample data"
                            >
                                Reset Sample
                            </Button>
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={handleDownloadTemplate}
                                type="text"
                                style={{ color: "#15803D", fontSize: 12 }}
                            >
                                Template (.xlsx)
                            </Button>
                        </Space>
                    </div>

                    {/* Interactive Spreadsheet Table */}
                    <div
                        style={{
                            border: "1px solid #E2E8F0",
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#FFFFFF",
                        }}
                    >
                        <Table
                            dataSource={sheetRows}
                            size="small"
                            pagination={sheetRows.length > 8 ? { pageSize: 8, size: "small" } : false}
                            scroll={{ x: 1100, y: 380 }}
                            rowKey="key"
                            columns={[
                                {
                                    title: "#",
                                    width: 45,
                                    align: "center",
                                    render: (_, __, idx) => (
                                        <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: 11 }}>
                                            {idx + 1}
                                        </span>
                                    ),
                                },
                                {
                                    title: (
                                        <span>
                                            Member ID <span style={{ color: "#DC2626" }}>*</span>
                                        </span>
                                    ),
                                    dataIndex: "employee_id",
                                    width: 130,
                                    render: (v, r) => (
                                        <Input
                                            size="small"
                                            value={v}
                                            placeholder="e.g. TM-101"
                                            onChange={(e) => handleUpdateRow(r.key, "employee_id", e.target.value)}
                                            style={{ borderRadius: 4, fontWeight: 600 }}
                                        />
                                    ),
                                },
                                {
                                    title: (
                                        <span>
                                            Full Name <span style={{ color: "#DC2626" }}>*</span>
                                        </span>
                                    ),
                                    dataIndex: "name",
                                    width: 170,
                                    render: (v, r) => (
                                        <Input
                                            size="small"
                                            value={v}
                                            placeholder="e.g. Priyanka Patel"
                                            onChange={(e) => handleUpdateRow(r.key, "name", e.target.value)}
                                            style={{ borderRadius: 4, fontWeight: 500 }}
                                        />
                                    ),
                                },
                                {
                                    title: (
                                        <span>
                                            Email <span style={{ color: "#DC2626" }}>*</span>
                                        </span>
                                    ),
                                    dataIndex: "email",
                                    width: 190,
                                    render: (v, r) => (
                                        <Input
                                            size="small"
                                            value={v}
                                            placeholder="e.g. priyanka@company.com"
                                            onChange={(e) => handleUpdateRow(r.key, "email", e.target.value)}
                                            style={{ borderRadius: 4 }}
                                        />
                                    ),
                                },
                                {
                                    title: "Department",
                                    dataIndex: "department",
                                    width: 150,
                                    render: (v, r) => (
                                        <Select
                                            size="small"
                                            value={v || undefined}
                                            placeholder="Select Dept"
                                            showSearch
                                            allowClear
                                            options={departmentOptions}
                                            onChange={(val) => handleUpdateRow(r.key, "department", val || "")}
                                            style={{ width: "100%" }}
                                        />
                                    ),
                                },
                                {
                                    title: (
                                        <span>
                                            Role <span style={{ color: "#DC2626" }}>*</span>
                                        </span>
                                    ),
                                    dataIndex: "role",
                                    width: 130,
                                    render: (v, r) => (
                                        <Select
                                            size="small"
                                            value={v || "Employee"}
                                            onChange={(val) => handleUpdateRow(r.key, "role", val)}
                                            style={{ width: "100%" }}
                                            options={[
                                                { value: "Employee", label: "Employee" },
                                                { value: "TL", label: "Team Lead (TL)" },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    title: (
                                        <span>
                                            Reporting To
                                        </span>
                                    ),
                                    dataIndex: "reporting_to",
                                    width: 180,
                                    render: (v, r) => {
                                        const isTL = r.role.trim().toUpperCase() === "TL" || r.role.trim().toUpperCase() === "TEAM LEAD";
                                        if (isTL) {
                                            return (
                                                <Tag
                                                    icon={<CrownOutlined />}
                                                    color="gold"
                                                    style={{ fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}
                                                >
                                                    Direct to Admin
                                                </Tag>
                                            );
                                        }
                                        return (
                                            <Select
                                                size="small"
                                                value={v || "Admin"}
                                                showSearch
                                                onChange={(val) => handleUpdateRow(r.key, "reporting_to", val)}
                                                style={{ width: "100%" }}
                                                options={reportingOptions}
                                            />
                                        );
                                    },
                                },
                                {
                                    title: "Password",
                                    dataIndex: "password",
                                    width: 130,
                                    render: (v, r) => (
                                        <Input
                                            size="small"
                                            value={v}
                                            placeholder="Auto Welcome@..."
                                            onChange={(e) => handleUpdateRow(r.key, "password", e.target.value)}
                                            style={{ borderRadius: 4, fontSize: 11 }}
                                        />
                                    ),
                                },
                                {
                                    title: "Status",
                                    dataIndex: "is_active",
                                    width: 100,
                                    render: (v, r) => (
                                        <Select
                                            size="small"
                                            value={v}
                                            onChange={(val) => handleUpdateRow(r.key, "is_active", val)}
                                            style={{ width: "100%" }}
                                            options={[
                                                { value: true, label: "Active" },
                                                { value: false, label: "Inactive" },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    title: "",
                                    width: 45,
                                    align: "center",
                                    render: (_, r) => (
                                        <Button
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleDeleteRow(r.key)}
                                            disabled={sheetRows.length <= 1}
                                            title="Delete Row"
                                        />
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODE 2: Preview & Selective Creation
               ══════════════════════════════════════════════════════════════════ */}
            {viewMode === "preview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Summary Alert Banner */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "10px 16px",
                            background: invalidCount > 0 ? "#FFFBEB" : "#F0FDF4",
                            border: `1px solid ${invalidCount > 0 ? "#FDE68A" : "#BBF7D0"}`,
                            borderRadius: 8,
                            fontSize: 13,
                        }}
                    >
                        <CheckCircleFilled style={{ color: invalidCount > 0 ? "#D97706" : "#10B981", fontSize: 18 }} />
                        <span style={{ color: "#1E293B" }}>
                            Total rows: <b>{parsedMembers.length}</b>
                        </span>
                        <span style={{ color: "#15803D" }}>
                            Ready: <b>{validCount}</b>
                        </span>
                        {selectedRowKeys.length > 0 && selectedRowKeys.length !== validCount && (
                            <span style={{ color: "#1D4ED8" }}>
                                Selected to create: <b>{selectedRowKeys.length}</b>
                            </span>
                        )}
                        {invalidCount > 0 && (
                            <span style={{ color: "#DC2626" }}>
                                Errors: <b>{invalidCount}</b>
                            </span>
                        )}
                    </div>

                    {/* Preview Table with Selection */}
                    <Table
                        dataSource={parsedMembers}
                        size="small"
                        pagination={{ pageSize: 6 }}
                        scroll={{ x: 880 }}
                        rowKey="key"
                        rowSelection={{
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys),
                            getCheckboxProps: (record) => ({
                                disabled: !record.isValid,
                            }),
                        }}
                        columns={[
                            {
                                title: "STATUS",
                                key: "status",
                                width: 95,
                                fixed: "left",
                                render: (_, row) =>
                                    row.isValid ? (
                                        <Tag icon={<CheckCircleOutlined />} color="success">
                                            Valid
                                        </Tag>
                                    ) : (
                                        <Tag icon={<CloseCircleOutlined />} color="error">
                                            Invalid
                                        </Tag>
                                    ),
                            },
                            {
                                title: "VALIDATION NOTE",
                                key: "validation_note",
                                width: 220,
                                render: (_, row) =>
                                    row.isValid ? (
                                        <span style={{ color: "#15803D", fontSize: 12, fontWeight: 500 }}>
                                            Ready to create
                                        </span>
                                    ) : (
                                        <span style={{ color: "#DC2626", fontSize: 12, fontWeight: 500 }}>
                                            {row.errorMsg}
                                        </span>
                                    ),
                            },
                            {
                                title: "MEMBER ID",
                                dataIndex: "employee_id",
                                key: "employee_id",
                                width: 120,
                                render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
                            },
                            {
                                title: "FULL NAME",
                                dataIndex: "name",
                                key: "name",
                                width: 150,
                                render: (v) => <span style={{ fontWeight: 600, color: "#1E293B" }}>{v}</span>,
                            },
                            { title: "EMAIL", dataIndex: "email", key: "email", width: 180 },
                            {
                                title: "DEPARTMENT",
                                dataIndex: "department",
                                key: "department",
                                width: 130,
                                render: (v) => v || <span style={{ color: "#94A3B8" }}>—</span>,
                            },
                            {
                                title: "ROLE",
                                dataIndex: "role",
                                key: "role",
                                width: 100,
                                render: (v) => (
                                    <Tag color={v === "TL" ? "purple" : "blue"} style={{ fontWeight: 600 }}>
                                        {v}
                                    </Tag>
                                ),
                            },
                            {
                                title: "REPORTING TO",
                                dataIndex: "reporting_to",
                                key: "reporting_to",
                                width: 160,
                                render: (v) =>
                                    v.toLowerCase().includes("admin") ? (
                                        <Tag icon={<CrownOutlined />} color="gold" style={{ fontWeight: 600 }}>
                                            Direct to Admin
                                        </Tag>
                                    ) : (
                                        <Tag color="cyan">{v}</Tag>
                                    ),
                            },
                            {
                                title: "ACCOUNT",
                                dataIndex: "is_active",
                                key: "is_active",
                                width: 90,
                                render: (v) => (
                                    <Tag color={v ? "green" : "default"}>
                                        {v ? "Active" : "Inactive"}
                                    </Tag>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SUB-MODAL: Paste from Google Sheets / Excel
               ══════════════════════════════════════════════════════════════════ */}
            <Modal
                open={pasteModalOpen}
                onCancel={() => {
                    setPasteModalOpen(false);
                    setPasteText("");
                }}
                title={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CopyOutlined style={{ color: "#0F9D58" }} /> Paste from Google Sheets or Excel
                    </span>
                }
                centered
                width={620}
                onOk={handlePasteImport}
                okText="Import Rows to Sheet"
                okButtonProps={{ style: { background: "#0F9D58", borderColor: "#0F9D58" } }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                        Copy cells from your Google Sheet or Excel workbook, then paste below (Ctrl+V).
                        <br />
                        Column order: <i>Member ID, Full Name, Email, Department, Role, Reporting To, Password, Is Active</i>.
                    </div>
                    <TextArea
                        rows={8}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="TM-101	Priyanka Patel	priyanka.tl@company.com	Tech	TL	Admin	Welcome@123	true&#10;TM-102	Arun Kumar	arun.dev@company.com	Tech	Employee	Priyanka Patel	Welcome@123	true"
                        style={{ fontFamily: "monospace", fontSize: 12 }}
                    />
                </div>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                SUB-MODAL: Import from Google Sheet Public Link
               ══════════════════════════════════════════════════════════════════ */}
            <Modal
                open={linkModalOpen}
                onCancel={() => {
                    setLinkModalOpen(false);
                    setSheetUrl("");
                }}
                title={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <LinkOutlined style={{ color: "#0F9D58" }} /> Import via Google Sheet Link
                    </span>
                }
                centered
                width={560}
                onOk={handleGoogleSheetLinkImport}
                confirmLoading={fetchingUrl}
                okText="Fetch & Load Sheet"
                okButtonProps={{ style: { background: "#0F9D58", borderColor: "#0F9D58" } }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                        Paste the URL of your Google Sheet. Ensure the sheet sharing is set to:
                        <br />
                        <b>"Anyone with the link can view"</b>.
                    </div>
                    <Input
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit"
                    />
                </div>
            </Modal>
        </Modal>
    );
}
