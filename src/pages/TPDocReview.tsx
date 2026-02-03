import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
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
  blocks: Array<
    | { type: "paragraph"; content: string }
    | { type: "bullet_list"; items: string[] }
    | { type: "table"; columns: string[]; rows: Array<Array<string | number | null>> }
    | { type: "appendix_ref"; content: string }
    | { type: "subheading"; content: string }
  >;
  source_fields: string[];
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

  const [document, setDocument] = useState<DocumentHeader | null>(null);
  const [draftSections, setDraftSections] = useState<DraftSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>(sectionParam ?? "1");
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const sectionsForRender = (() => {
    if (selectedSection !== "3") {
      return draftSections.map((section) => ({ ...section, displaySectionId: section.section_id }));
    }
    let counter = 0;
    return draftSections.map((section) => {
      if (section.section === "3" && section.section_id !== "3.0") {
        counter += 1;
        return { ...section, displaySectionId: `3.${counter}` };
      }
      return { ...section, displaySectionId: section.section_id };
    });
  })();

  // Load document header
  useEffect(() => {
    if (!docId) return;
    fetch(`${apiBase}/drafts/${docId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
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
    setIsLoadingSections(true);
    fetch(`${apiBase}/draft-documents/sections?document_id=${encodeURIComponent(docId)}&section=${selectedSection}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setDraftSections(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load draft sections", err);
      })
      .finally(() => setIsLoadingSections(false));
  }, [apiBase, docId, selectedSection]);

  useEffect(() => {
    if (sectionParam && sectionParam !== selectedSection) {
      setSelectedSection(sectionParam);
    }
  }, [sectionParam, selectedSection]);

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
    setSearchParams({ id: docId, section });
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
          <Label htmlFor="section-select" className="text-sm font-medium">
            Section:
          </Label>
          <Select value={selectedSection} onValueChange={handleSectionChange}>
            <SelectTrigger id="section-select" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  Section {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            Generate Document
          </Button>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Editable Canvas */}
        <div className="flex-1 flex flex-col border-r bg-muted/30">
          {/* Canvas Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-4xl mx-auto">
              <div
                ref={canvasRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-full prose prose-sm dark:prose-invert max-w-none focus:outline-none"
              >
                {isLoadingSections ? (
                  <p className="text-sm text-muted-foreground">Loading section...</p>
                ) : draftSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No draft content for this section yet.</p>
                ) : (
                  sectionsForRender.map((section) => (
                    <div key={section.draft_section_id} className="space-y-4 mb-8">
                      <div>
                        <h2 className="text-lg font-semibold">{section.displaySectionId} {section.title}</h2>
                      </div>
                      {section.blocks.map((block, idx) => {
                        if (block.type === "paragraph") {
                          return <p key={`${section.draft_section_id}-p-${idx}`}>{block.content}</p>;
                        }
                        if (block.type === "subheading") {
                          return (
                            <p key={`${section.draft_section_id}-h-${idx}`}>
                              <span className="underline font-medium">{block.content}</span>
                            </p>
                          );
                        }
                        if (block.type === "bullet_list") {
                          return (
                            <ul key={`${section.draft_section_id}-b-${idx}`} className="space-y-2">
                              {block.items.map((item, itemIdx) => (
                                <li key={`${section.draft_section_id}-b-${idx}-${itemIdx}`} className="flex gap-2">
                                  <span>-</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        if (block.type === "appendix_ref") {
                          return <p key={`${section.draft_section_id}-a-${idx}`}><em>{block.content}</em></p>;
                        }
                        if (block.type === "table") {
                          return (
                            <div key={`${section.draft_section_id}-t-${idx}`} className="overflow-x-auto">
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    {block.columns.map((col) => (
                                      <th key={`${section.draft_section_id}-t-${idx}-${col}`}>{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {block.rows.map((row, rowIdx) => (
                                    <tr key={`${section.draft_section_id}-t-${idx}-r-${rowIdx}`}>
                                      {row.map((cell, cellIdx) => (
                                        <td key={`${section.draft_section_id}-t-${idx}-r-${rowIdx}-c-${cellIdx}`}>
                                          {cell ?? ""}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Chatbot Interface */}
        <div className="w-96 flex flex-col bg-card border-l">
          {/* Chat Header */}
          <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="font-medium">AI Assistant</span>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
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
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user"
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

          {/* Input Area */}
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
      </div>
    </div>
  );
}
