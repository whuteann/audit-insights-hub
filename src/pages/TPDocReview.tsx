import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImagePlus,
  Table as TableIcon,
  Rows2,
  Columns2,
  TableCellsMerge,
  TableCellsSplit,
  FileDown,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Resizable from "tiptap-extension-resizable";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DraftSection = {
  draft_section_id: string;
  draft_document_id: string;
  section_rules_id: string;
  section_id: string;
  section: string;
  title: string;
  description: string | null;
  content_html: string | null;
  source_fields: string[];
  is_snapshot?: boolean;
};

type DocumentHeader = {
  company_name: string | null;
  status: string | null;
  updated_at: string | null;
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function TPDocReview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const docId = searchParams.get("id");
  const sectionParam = searchParams.get("section");
  const versionParam = searchParams.get("version");

  const [document, setDocument] = useState<DocumentHeader | null>(null);
  const [documentData, setDocumentData] = useState<Record<string, any> | null>(null);
  const [draftSections, setDraftSections] = useState<DraftSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>(sectionParam ?? "1");
  const [availableVersions, setAvailableVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>(versionParam ?? "");
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [dataSearch, setDataSearch] = useState("");
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [activePanel, setActivePanel] = useState<"data" | "assistant">("data");
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<Record<string, any> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const fontSizeExtension = useMemo(
    () =>
      TextStyle.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            fontSize: {
              default: null,
              parseHTML: (element) => element.style.fontSize?.replace(/['"]/g, "") || null,
              renderHTML: (attributes) => {
                if (!attributes.fontSize) {
                  return {};
                }
                return { style: `font-size: ${attributes.fontSize}` };
              },
            },
          };
        },
      }),
    []
  );

  const imageWithStyle = useMemo(
    () =>
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => element.getAttribute("style"),
              renderHTML: (attributes) => (attributes.style ? { style: attributes.style } : {}),
            },
          };
        },
      }),
    []
  );

  const editorExtensions = useMemo(
    () => [
      StarterKit,
      Underline,
      fontSizeExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      imageWithStyle.configure({
        inline: false,
        allowBase64: true,
      }),
      Resizable.configure({
        types: ["image"],
        resizeDirections: ["bottom", "bottom-right", "right"],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    [fontSizeExtension, imageWithStyle]
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "tiptap min-h-[480px] focus:outline-none",
      },
    },
  });

  const sectionsForRender = useMemo(() => {
    if (selectedSection !== "4") {
      return draftSections.map((section) => ({ ...section, displaySectionId: section.section_id }));
    }
    let counter = 0;
    return draftSections.map((section) => {
      if (section.section === "4" && section.section_id !== "4.0") {
        counter += 1;
        return { ...section, displaySectionId: `4.${counter}` };
      }
      return { ...section, displaySectionId: section.section_id };
    });
  }, [draftSections, selectedSection]);

  const sectionsToHtml = (sections: Array<DraftSection & { displaySectionId: string }>) =>
    sections
      .map((section) => {
        const body = section.content_html || "<p></p>";
        if (section.is_snapshot) {
          return `<section data-draft-section-id="${section.draft_section_id}">${body}</section>`;
        }
        const heading = `<h2>${section.displaySectionId} ${section.title}</h2>`;
        return `<section data-draft-section-id="${section.draft_section_id}">${heading}${body}</section>`;
      })
      .join("") || "<p></p>";

  const editorHtml = useMemo(() => sectionsToHtml(sectionsForRender), [sectionsForRender]);
  const lastEditorHtmlRef = useRef<string | null>(null);

  // Load document header
  useEffect(() => {
    if (!docId) return;
    fetch(`${apiBase}/drafts/${docId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setDocumentData(data ?? null);
        setDocument({
          company_name: data.company_name ?? null,
          status: data.status ?? null,
          updated_at: data.updated_at ?? null,
        });
      })
      .catch((err) => {
        console.error("Failed to load document header", err);
      });
  }, [apiBase, docId]);

  // Load draft sections for selected section
  useEffect(() => {
    if (!docId) return;
    fetch(`${apiBase}/draft-documents/versions?document_id=${encodeURIComponent(docId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const versions = Array.isArray(data?.versions) ? data.versions.map(Number).filter(Number.isFinite) : [];
        setAvailableVersions(versions);
        if (versions.length === 0) return;
        const normalized = versionParam && versions.includes(Number(versionParam))
          ? String(Number(versionParam))
          : String(data.latest_version ?? versions[0]);
        setSelectedVersion(normalized);
        const nextParams = new URLSearchParams();
        nextParams.set("id", docId);
        nextParams.set("section", sectionParam ?? "1");
        nextParams.set("version", normalized);
        setSearchParams(nextParams, { replace: true });
      })
      .catch((err) => {
        console.error("Failed to load draft versions", err);
      });
  }, [apiBase, docId, sectionParam, setSearchParams, versionParam]);

  useEffect(() => {
    if (!docId || !selectedVersion) return;
    setIsLoadingSections(true);
    fetch(
      `${apiBase}/draft-documents/sections?document_id=${encodeURIComponent(docId)}&section=${selectedSection}&version=${encodeURIComponent(selectedVersion)}`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setDraftSections(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load draft sections", err);
      })
      .finally(() => setIsLoadingSections(false));
  }, [apiBase, docId, selectedSection, selectedVersion]);

  useEffect(() => {
    if (sectionParam && sectionParam !== selectedSection) {
      setSelectedSection(sectionParam);
    }
  }, [sectionParam, selectedSection]);

  useEffect(() => {
    if (versionParam && versionParam !== selectedVersion) {
      setSelectedVersion(versionParam);
    }
  }, [versionParam, selectedVersion]);

  useEffect(() => {
    if (!editor) return;
    if (isLoadingSections) {
      if (lastEditorHtmlRef.current !== "<p></p>") {
        editor.commands.setContent("<p></p>");
        lastEditorHtmlRef.current = "<p></p>";
      }
      return;
    }
    if (lastEditorHtmlRef.current === editorHtml) {
      return;
    }
    editor.commands.setContent(editorHtml);
    lastEditorHtmlRef.current = editorHtml;
  }, [editor, isLoadingSections, editorHtml]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you're asking about "${inputMessage}". Based on the TP documentation for ${"this company"}, I can help you review and analyze the transfer pricing aspects. Would you like me to focus on a specific section?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    if (!docId) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("id", docId);
    nextParams.set("section", section);
    if (selectedVersion) nextParams.set("version", selectedVersion);
    setSearchParams(nextParams);
  };

  const handleVersionChange = (version: string) => {
    setSelectedVersion(version);
    if (!docId) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("id", docId);
    nextParams.set("section", selectedSection);
    nextParams.set("version", version);
    setSearchParams(nextParams);
  };

  const handleReassemble = async () => {
    if (!docId) return;
    try {
      const res = await fetch(
        `${apiBase}/draft-documents/assemble?document_id=${encodeURIComponent(docId)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to reassemble document");
      const payload = await res.json();
      const version = payload?.version ? String(payload.version) : "";
      if (version) {
        setSelectedVersion(version);
      }
      toast({
        title: "Document reassembled",
        description: version ? `Created version ${version}.` : "New version created.",
      });
      const versionsRes = await fetch(`${apiBase}/draft-documents/versions?document_id=${encodeURIComponent(docId)}`);
      if (versionsRes.ok) {
        const versionsPayload = await versionsRes.json();
        const versions = Array.isArray(versionsPayload?.versions) ? versionsPayload.versions.map(Number).filter(Number.isFinite) : [];
        setAvailableVersions(versions);
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("id", docId);
      nextParams.set("section", selectedSection);
      if (version) nextParams.set("version", version);
      setSearchParams(nextParams);
    } catch (err) {
      console.error("Failed to reassemble draft", err);
      toast({
        title: "Reassemble failed",
        description: "Unable to reassemble document sections.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadWord = async () => {
    if (!docId) return;
    try {
      setIsExporting(true);
      const versionQuery = selectedVersion ? `&version=${encodeURIComponent(selectedVersion)}` : "";
      const res = await fetch(
        `${apiBase}/draft-documents/export-docx?document_id=${encodeURIComponent(docId)}${versionQuery}`
      );
      if (!res.ok) throw new Error("Failed to export Word document");

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = filenameMatch?.[1] || `TPD_${docId}.docx`;

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast({
        title: "Download failed",
        description: "Unable to export Word document.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSection = async () => {
    if (!docId || !selectedVersion || !editor) return;
    try {
      setIsSavingSection(true);
      const res = await fetch(`${apiBase}/draft-documents/section-snapshots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          version: Number(selectedVersion),
          section: selectedSection,
          content_html: editor.getHTML(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save section snapshot");
      toast({
        title: "Saved",
        description: `Section ${selectedSection} saved to this draft version.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Save failed",
        description: "Unable to save section changes.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleInsertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: Math.max(1, tableRows), cols: Math.max(1, tableCols), withHeaderRow: true })
      .run();
  };

  const handleFontSizeChange = (value: string) => {
    if (!editor) return;
    if (value === "default") {
      editor.chain().focus().unsetMark("textStyle").run();
      return;
    }
    editor.chain().focus().setMark("textStyle", { fontSize: value }).run();
  };

  const dataSections = useMemo(
    () => [
      {
        id: "1",
        title: "1. Engagement & Entity Setup",
        fields: [
          { key: "company_name", label: "Company name", kind: "text" },
          { key: "brand_names", label: "Brand name(s)", kind: "list" },
          { key: "financial_year_end", label: "Financial year end", kind: "date" },
          { key: "jurisdiction", label: "Jurisdiction", kind: "text" },
          { key: "is_loss_making", label: "Is loss-making?", kind: "yesno" },
        ],
      },
      {
        id: "2",
        title: "2. Group Ownership Structure",
        fields: [{ key: "group_ownership", label: "Group ownership structure", kind: "table" }],
      },
      {
        id: "3",
        title: "3. Group Business Overview",
        fields: [
          { key: "major_business_lines", label: "Major business lines", kind: "list" },
          { key: "business_lines_other", label: "If Other, specify", kind: "text" },
          { key: "products_services_desc", label: "Products / services description", kind: "text" },
          { key: "key_business_drivers", label: "Key business drivers", kind: "text" },
          { key: "main_geographic_markets", label: "Main geographic markets", kind: "list" },
          { key: "supply_chain_desc", label: "Supply chain description", kind: "text" },
          { key: "key_competitors", label: "Key competitors", kind: "table" },
          { key: "industry_regulatory_economic", label: "Industry / regulatory / economic conditions", kind: "text" },
          { key: "restructuring_occurred", label: "Business restructuring occurred?", kind: "yesno" },
          { key: "restructuring_details", label: "Restructuring details", kind: "text" },
        ],
      },
      {
        id: "4",
        title: "4. Intangible Assets",
        fields: [
          { key: "intangible_types", label: "Types of intangibles used", kind: "list" },
          { key: "ip_owner_entity", label: "IP owner entity", kind: "text" },
          { key: "intangible_agreements_exist", label: "Intangible agreements exist?", kind: "yesno" },
          { key: "intangible_agreements_upload", label: "Upload intangible agreements", kind: "list" },
          { key: "intangible_transfer_during_fy", label: "Intangible transfer during FY?", kind: "yesno" },
          { key: "intangible_transfers", label: "Intangible transfers", kind: "table" },
        ],
      },
      {
        id: "5",
        title: "5. Intercompany Financing",
        fields: [
          { key: "funding_third_party_pct", label: "Funding structure: % third-party", kind: "text" },
          { key: "funding_intercompany_pct", label: "Funding structure: % intercompany loans", kind: "text" },
          { key: "funding_equity_pct", label: "Funding structure: % equity", kind: "text" },
          { key: "related_party_borrowings", label: "Related party borrowing table", kind: "table" },
          { key: "third_party_financing", label: "Third-party financing table", kind: "table" },
        ],
      },
      {
        id: "6",
        title: "6. Intercompany Services",
        fields: [{ key: "intercompany_services", label: "Intercompany service agreements", kind: "table" }],
      },
      {
        id: "7",
        title: "7. Local Company Profile",
        fields: [
          { key: "local_company_overview", label: "Company overview", kind: "text" },
          { key: "local_business_model", label: "Business model", kind: "text" },
          { key: "local_business_strategy_choice", label: "Business strategy", kind: "text" },
          { key: "local_business_strategy_desc", label: "Business strategy (details)", kind: "text" },
        ],
      },
      {
        id: "8",
        title: "8. Organisation & Headcount",
        fields: [
          { key: "departments", label: "Departments", kind: "table" },
          { key: "org_chart_upload", label: "Organisation chart upload", kind: "list" },
          { key: "management_reporting_line", label: "Management reporting line", kind: "table" },
        ],
      },
      {
        id: "9",
        title: "9. Financial & Tax Data",
        fields: [
          { key: "form_c_upload", label: "Form C upload", kind: "list" },
          { key: "tax_computation_upload", label: "Tax computation upload", kind: "list" },
          { key: "management_accounts_upload", label: "Management accounts upload", kind: "list" },
          { key: "consolidated_group_revenue", label: "Consolidated group revenue", kind: "text" },
          { key: "local_profit_before_tax", label: "Local profit / loss before tax", kind: "text" },
          { key: "apa_exists", label: "APA exists?", kind: "yesno" },
        ],
      },
      {
        id: "10",
        title: "10. Loss-Making Justification (Conditional)",
        fields: [{ key: "loss_reasons", label: "Top 3 loss reasons", kind: "table" }],
      },
      {
        id: "11",
        title: "11. Services Provided, Customers & Suppliers",
        fields: [
          { key: "services_provided", label: "Services provided", kind: "table" },
          { key: "customers", label: "Main Customers", kind: "table" },
          { key: "suppliers", label: "Main Suppliers", kind: "table" },
        ],
      },
      {
        id: "12",
        title: "12. Projects",
        fields: [{ key: "projects", label: "Projects", kind: "table" }],
      },
      {
        id: "13",
        title: "13. Related Party Transactions – Scoping",
        fields: [{ key: "rpt_types_selected", label: "Transaction types", kind: "list" }],
      },
      {
        id: "14",
        title: "14. Related Party Transactions – Detail",
        fields: [{ key: "rpt_details_by_type", label: "RPT Details", kind: "table" }],
      },
      {
        id: "15",
        title: "15. Pricing Policy",
        fields: [{ key: "pricing_policy", label: "Pricing policy", kind: "text" }],
      },
      {
        id: "16",
        title: "16. Functional Analysis (FAR)",
        fields: [
          { key: "functions_table", label: "Functions table", kind: "table" },
          { key: "risks_table", label: "Risks table", kind: "table" },
          { key: "tangible_assets", label: "Tangible assets", kind: "list" },
          { key: "trade_intangibles_used", label: "Trade intangibles used", kind: "list" },
          { key: "marketing_intangibles_used", label: "Marketing intangibles used", kind: "list" },
        ],
      },
      {
        id: "17",
        title: "17. Benchmark Results",
        fields: [
          { key: "number_of_comparables", label: "Number of comparables", kind: "text" },
          { key: "median", label: "Median", kind: "text" },
          { key: "p375", label: "37.5 percentile", kind: "text" },
          { key: "p625", label: "62.5 percentile", kind: "text" },
        ],
      },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    const query = dataSearch.trim().toLowerCase();
    if (!query) return dataSections;
    return dataSections
      .map((section) => {
        const matchSection = section.title.toLowerCase().includes(query);
        const fields = section.fields.filter((field) => field.label.toLowerCase().includes(query));
        return matchSection ? section : { ...section, fields };
      })
      .filter((section) => section.fields.length > 0);
  }, [dataSections, dataSearch]);

  const isFileMetadata = (value: unknown): value is Record<string, any> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const v = value as Record<string, any>;
    return (typeof v.path === "string" || typeof v.download_url === "string") &&
      (typeof v.original_name === "string" || typeof v.filename === "string");
  };

  const formatFileSize = (sizeBytes?: number) => {
    if (!sizeBytes || sizeBytes <= 0) return "—";
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const humanizeKey = (key: string) =>
    key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

  const getDownloadUrl = (meta: Record<string, any>) => {
    const raw = meta.download_url as string | undefined;
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `${apiBase}${raw}`;
  };

  const getPreviewUrl = (meta: Record<string, any>) => {
    const url = getDownloadUrl(meta);
    if (!url) return null;
    const hasQuery = url.includes("?");
    return `${url}${hasQuery ? "&" : "?"}inline=1`;
  };

  const triggerDownload = (meta: Record<string, any>) => {
    const url = getDownloadUrl(meta);
    if (!url) return;
    const link = window.document.createElement("a");
    link.href = url;
    link.download = meta.original_name || meta.filename || "download";
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openFilePreview = (meta: Record<string, any>) => {
    setPreviewFile(meta);
    setIsFilePreviewOpen(true);
  };

  const isPreviewableFile = (meta: Record<string, any>) => {
    const contentType = String(meta.content_type || "").toLowerCase();
    const name = String(meta.original_name || meta.filename || "").toLowerCase();
    return (
      contentType === "application/pdf" ||
      contentType === "image/png" ||
      contentType === "image/jpeg" ||
      contentType === "image/jpg" ||
      name.endsWith(".pdf") ||
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg")
    );
  };

  const renderValue = (field: { key: string; label: string; kind: string }): unknown => {
    if (!documentData) return "—";
    const value = documentData[field.key];
    if (value === null || value === undefined || value === "") return "—";
    if (field.kind === "yesno") return value === true ? "Yes" : "No";
    if (field.kind === "date") {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    if (field.kind === "list") {
      if (isFileMetadata(value)) return value;
      if (Array.isArray(value) && value.length > 0) return value.join(", ");
      if (Array.isArray(value)) return "—";
      return String(value);
    }
    if (field.kind === "table") {
      if (Array.isArray(value)) return value;
      return [];
    }
    return String(value);
  };

  const handleImageUpload = (file: File) => {
    if (!editor) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      console.error("Unsupported image type");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      console.error("Image too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  };

  const setImageAlign = (align: "left" | "center" | "right") => {
    if (!editor) return;
    const styleMap: Record<string, string> = {
      left: "display:block;margin:0 auto 0 0;",
      center: "display:block;margin:0 auto;",
      right: "display:block;margin:0 0 0 auto;",
    };
    editor.chain().focus().updateAttributes("image", { style: styleMap[align] }).run();
  };

  const applyAlignment = (align: "left" | "center" | "right") => {
    if (!editor) return;
    if (editor.isActive("image")) {
      setImageAlign(align);
      return;
    }
    editor.chain().focus().setTextAlign(align).run();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tp-docs")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-lg font-semibold">
              Review: {document?.company_name || "TP Document"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {(document?.status ?? "draft") === "draft" ? "Draft" : "Generated"} • Last updated: {document?.updated_at ? new Date(document.updated_at).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReassemble}>
            Reassemble
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveSection} disabled={isSavingSection}>
            {isSavingSection ? "Saving..." : "Save Section"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadWord} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Download Word"}
          </Button>
          <Label htmlFor="version-select" className="text-sm font-medium">
            Version:
          </Label>
          <Select value={selectedVersion} onValueChange={handleVersionChange} disabled={availableVersions.length === 0}>
            <SelectTrigger id="version-select" className="w-32">
              <SelectValue placeholder="Latest" />
            </SelectTrigger>
            <SelectContent>
              {availableVersions.map((version) => (
                <SelectItem key={version} value={String(version)}>
                  V{version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label htmlFor="section-select" className="text-sm font-medium">
            Section:
          </Label>
          <Select value={selectedSection} onValueChange={handleSectionChange}>
            <SelectTrigger id="section-select" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  Section {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* <Button variant="outline" size="sm">
            Generate Document
          </Button> */}
        </div>
      </div>
      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Editable Canvas */}
        <div className="flex-1 flex flex-col border-r bg-muted/30">
          {/* Editor Toolbar */}
          <div className="border-b bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  disabled={!editor?.can().chain().focus().toggleBold().run()}
                  title="Bold"
                  aria-label="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  disabled={!editor?.can().chain().focus().toggleItalic().run()}
                  title="Italic"
                  aria-label="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  disabled={!editor?.can().chain().focus().toggleUnderline().run()}
                  title="Underline"
                  aria-label="Underline"
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <span className="sr-only">Font size</span>
                <Select onValueChange={handleFontSizeChange} defaultValue="default">
                  <SelectTrigger id="font-size" className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    {["12px", "14px", "16px", "18px", "24px", "32px"].map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <span className="sr-only">Table</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, Number(e.target.value) || 1))}
                    className="h-8 w-16"
                  />
                  <span className="text-xs text-muted-foreground">rows</span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, Number(e.target.value) || 1))}
                    className="h-8 w-16"
                  />
                  <span className="text-xs text-muted-foreground">cols</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleInsertTable} disabled={!editor}>
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().addRowAfter().run()}
                  disabled={!editor?.can().chain().focus().addRowAfter().run()}
                  title="Add row"
                  aria-label="Add row"
                >
                  <Rows2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().addColumnAfter().run()}
                  disabled={!editor?.can().chain().focus().addColumnAfter().run()}
                  title="Add column"
                  aria-label="Add column"
                >
                  <Columns2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().mergeCells().run()}
                  disabled={!editor?.can().chain().focus().mergeCells().run()}
                  title="Merge cells"
                  aria-label="Merge cells"
                >
                  <TableCellsMerge className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editor?.chain().focus().splitCell().run()}
                  disabled={!editor?.can().chain().focus().splitCell().run()}
                  title="Split cell"
                  aria-label="Split cell"
                >
                  <TableCellsSplit className="h-4 w-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="h-8 w-56"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleImageUpload(file);
                    e.currentTarget.value = "";
                  }}
                />
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyAlignment("left")}
                  disabled={
                    !editor ||
                    (!editor.isActive("image") && !editor?.can().chain().focus().setTextAlign("left").run())
                  }
                  title="Align left"
                  aria-label="Align left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyAlignment("center")}
                  disabled={
                    !editor ||
                    (!editor.isActive("image") && !editor?.can().chain().focus().setTextAlign("center").run())
                  }
                  title="Align center"
                  aria-label="Align center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyAlignment("right")}
                  disabled={
                    !editor ||
                    (!editor.isActive("image") && !editor?.can().chain().focus().setTextAlign("right").run())
                  }
                  title="Align right"
                  aria-label="Align right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {/* Canvas Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-4xl mx-auto">
              {isLoadingSections ? (
                <p className="text-sm text-muted-foreground mb-4">Loading section...</p>
              ) : draftSections.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">
                  No draft content for this section yet.
                </p>
              ) : null}
              <EditorContent editor={editor} />
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Chatbot + Document Data */}
        <div className="w-96 flex flex-col bg-card border-l">
          <div className="flex flex-col h-full">
            {/* <div className="h-12 border-b flex items-center px-4 shrink-0">
              <div className="flex w-full gap-2 overflow-x-auto">
                <Button
                  variant={activePanel === "data" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setActivePanel("data")}
                >
                  Document Data
                </Button>
                <Button
                  variant={activePanel === "assistant" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setActivePanel("assistant")}
                >
                  AI Assistant
                </Button>
              </div>
            </div> */}

            {activePanel === "data" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 pt-4 shrink-0">
                  <Input
                    value={dataSearch}
                    onChange={(e) => setDataSearch(e.target.value)}
                    placeholder="Search sections or fields..."
                  />
                </div>
                <ScrollArea className="flex-1 h-full p-4">
                  <div className="space-y-4">
                    {filteredSections.map((section) => (
                      <div key={section.id} className="rounded-lg border bg-card/60 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{section.title}</h3>
                          <span className="text-xs text-muted-foreground">Section {section.id}</span>
                        </div>
                        <div className="space-y-3">
                          {section.fields.map((field) => {
                            const value: unknown = renderValue(field);
                            if (field.kind === "table") {
                              const rows = Array.isArray(value) ? value : [];
                              return (
                                <div key={field.key} className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                                  {rows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">—</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {rows.map((row: Record<string, any>, idx: number) => (
                                        <div key={row.id ?? `${field.key}-${idx}`} className="rounded-md border p-3 space-y-1 text-sm">
                                          <div className="text-xs text-muted-foreground">Row {idx + 1}</div>
                                          {Object.entries(row)
                                            .filter(([key]) => key !== "id")
                                            .map(([key, val]) => (
                                              <div key={key} className="flex items-start justify-between gap-3">
                                                <span className="text-xs text-muted-foreground">{key}</span>
                                                {isFileMetadata(val) ? (
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => openFilePreview(val)}
                                                  >
                                                    View
                                                  </Button>
                                                ) : (
                                                  <span className="text-right">{val ?? "—"}</span>
                                                )}
                                              </div>
                                            ))}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div key={field.key} className="space-y-1 p-2">
                                <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {field.label}
                                </span>
                                {isFileMetadata(value) ? (
                                  (() => {
                                    const fileMeta = value;
                                    return (
                                      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                                        <p className="text-sm font-medium break-all">
                                          {fileMeta.original_name || fileMeta.filename || "Uploaded file"}
                                        </p>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                          <p>Size: {formatFileSize(fileMeta.size_bytes)}</p>
                                          <p>
                                            Uploaded:{" "}
                                            {fileMeta.uploaded_at ? new Date(fileMeta.uploaded_at).toLocaleString() : "—"}
                                          </p>
                                        </div>
                                        <Button type="button" size="sm" variant="outline" onClick={() => openFilePreview(fileMeta)}>
                                          View
                                        </Button>
                                      </div>
                                    );
                                  })()
                                ) : value && typeof value === "object" && !Array.isArray(value) ? (
                                  (() => {
                                    const obj = value as Record<string, unknown>;
                                    const entries = Object.entries(obj);
                                    if (entries.length === 0) {
                                      return (
                                        <span className="block text-sm leading-relaxed break-words whitespace-pre-wrap">
                                          —
                                        </span>
                                      );
                                    }
                                    return (
                                      <div className="space-y-1 rounded-md border bg-muted/20 p-2">
                                        {entries.map(([k, v]) => (
                                          <div key={k} className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                            <span className="font-medium">{humanizeKey(k)}:</span>{" "}
                                            <span>{v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="block text-sm leading-relaxed break-words whitespace-pre-wrap">
                                    {value as string}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 h-full p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Ask questions about the TP documentation
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                          {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                              }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="border-t p-4 shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about the TP documentation..."
                      rows={1}
                      className="min-h-[44px] max-h-[120px] resize-none"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isFilePreviewOpen} onOpenChange={setIsFilePreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.original_name || previewFile?.filename || "File Preview"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Size: {formatFileSize(previewFile?.size_bytes)}{" "}
              {previewFile?.uploaded_at ? `• Uploaded ${new Date(previewFile.uploaded_at).toLocaleString()}` : ""}
            </div>
            <div className="rounded-md border bg-muted/20 h-[60vh] overflow-hidden">
              {previewFile && isPreviewableFile(previewFile) && getDownloadUrl(previewFile) ? (
                String(previewFile.content_type || "").toLowerCase().startsWith("image/") ? (
                  <div className="h-full w-full flex items-center justify-center p-4">
                    <img
                      src={getPreviewUrl(previewFile) ?? ""}
                      alt={previewFile.original_name || previewFile.filename || "Preview"}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <iframe
                    title="File preview"
                    src={getPreviewUrl(previewFile) ?? ""}
                    className="h-full w-full"
                  />
                )
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Preview not available for this file type.
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => previewFile && triggerDownload(previewFile)}
                disabled={!previewFile}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
