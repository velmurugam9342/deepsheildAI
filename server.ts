import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini AI
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not set or has placeholder value. Running in offline cybersecurity simulation mode.");
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
      return null;
    }
  }
  return aiClient;
}

// REST API Endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "active",
    platform: "SentinelX AI",
    version: "3.2.0-enterprise",
    timestamp: new Date().toISOString(),
    database: "Firestore Simulated Connection (Local Sandbox)",
    systems: {
      risk_engine: "online",
      swft_monitor: "online",
      quantum_readiness: "synced",
      user_behavior_analytics: "active"
    }
  });
});

// AI Security Copilot Endpoint
app.post("/api/copilot", async (req, res) => {
  const { message, history = [], incidentContext, userContext } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message parameter is required." });
  }

  const ai = getGeminiClient();

  // If Gemini API is not available, provide high-quality fallback answers
  if (!ai) {
    return res.json({
      text: getOfflineCopilotResponse(message, incidentContext, userContext),
      offline: true
    });
  }

  try {
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Inject cybersecurity system instructions & context
    const systemPrompt = `You are the SentinelX AI Security Copilot, an elite Cyber-Forensics Specialist, Insider Threat Investigator, and Banking Risk Officer working in the Security Operations Center (SOC) of FinSpark Global Bank.
Your goal is to assist SOC analysts in identifying and mitigating insider threats, privilege escalations, unauthorized database queries, Swft wire transfers anomalies, and post-quantum migration vulnerabilities.

Guidelines:
1. Always maintain a professional, analytical, objective, and authoritative security tone.
2. Provide actionable mitigation recommendations mapped to the MITRE ATT&CK framework (e.g. T1078 Valid Accounts, T1030 Data Transfer Limits).
3. If the analyst asks about a specific active incident or user profile, use the provided context to offer surgical advice.
4. Keep explanations concise, highly technical but readable, using clear bullet points for step-by-step containment.
5. Emphasize "Zero Trust Architecture" and "Least Privilege Access" principles.

Contextual Security State:
- Active Incident Context: ${incidentContext ? JSON.stringify(incidentContext) : "No specific incident active."}
- Focused User Profile: ${userContext ? JSON.stringify(userContext) : "No user profile focused currently."}
`;

    // Initialize chat
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: message });
    res.json({
      text: response.text,
      offline: false
    });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({
      error: "AI Copilot failed to process request.",
      details: error.message,
      text: "🚨 *SentinelX Emergency Override:* The primary AI core reported a connection timeout. Local security containment guidelines are still fully functional. Detail your security query, or ask about standard SOC remediation templates."
    });
  }
});

// Offline rule-based threat expert simulation
function getOfflineCopilotResponse(query: string, incident: any, user: any): string {
  const lowercase = query.toLowerCase();

  let contextSnippet = "";
  if (incident) {
    contextSnippet = `\n\n**Current Incident Context Detected:**\n- **Incident:** ${incident.title} (${incident.severity})\n- **Trigger:** Unusual sequence: ${incident.anomalyType}\n- **Assigned:** Tier-3 Forensic Unit`;
  } else if (user) {
    contextSnippet = `\n\n**Focused User Context Detected:**\n- **Subject:** ${user.name} (${user.role} - ${user.department})\n- **Risk Score:** ${user.riskScore}/100 (Drift: +${user.drift}%)\n- **Status:** ${user.status}`;
  }

  if (lowercase.includes("recommend") || lowercase.includes("mitigate") || lowercase.includes("action") || lowercase.includes("contain")) {
    return `### SentinelX Threat Mitigation Protocol (Local Core)

Based on standard FinSpark SOC Playbooks, I have compiled containment protocols for potential insider threat and privilege abuse vectors:

1. **Immediate Session Termination & Credential Revocation (MITRE T1531)**
   - Issue automatic kill-signal to Active Directory for the compromised endpoint.
   - Revoke active OAuth grant tokens and set session TTL to 0 seconds.

2. **Access Control Hardening (MITRE T1078)**
   - Transition user profile into **Isolated Sandbox Mode** (Read-Only access to core Swift & Treasury vaults).
   - Require immediate **Out-of-Band MFA Verification** via FIDO2 hardware token or secure push.

3. **Technical Audit & Forensic Log Collection**
   - Stream the last 120 minutes of database activity and terminal commands to the Isolated Forensic Bucket.
   - Trigger network segment isolation (VPC security group restriction) for the IP address range associated with the user's recent sessions.

Would you like me to generate a formal containment authorization request?${contextSnippet}`;
  }

  if (lowercase.includes("quantum") || lowercase.includes("post-quantum") || lowercase.includes("pqc") || lowercase.includes("crypto")) {
    return `### Post-Quantum Cryptographic (PQC) Readiness Assessment

FinSpark Global Bank is currently executing a transition to NIST-approved post-quantum algorithms (Kyber/Dilithium/ML-KEM). 

*Current Agility Status:*
- **Post-Quantum Migration Score:** 68% (Ahead of the FY27 industry baseline of 52%).
- **Key Vulnerability:** Legacy TLS 1.2 handshakes still active on regional branch ATMs (using RSA-2048).
- **Quantum-Safe Standard:** Active tunnels are being systematically migrated to **ML-KEM-1024** and **ML-DSA-87** hybrid signatures.

*Recommended Actions:*
- Initiate crypto-inventory scan on the treasury ledger API endpoints.
- Deprecate RSA-1024/2048 and ECDSA-P256 on all incoming corporate client channels.${contextSnippet}`;
  }

  if (lowercase.includes("explain") || lowercase.includes("alert") || lowercase.includes("why")) {
    return `### AI Threat Forensic Briefing (Local Analysis)

We detected a **multi-stage insider threat corridor** matching behavioral signature **X-8800 (Drift Anomaly)**:

- **Phase 1 (Access Drift):** Credential escalation followed by cross-department file accesses in Core Treasury.
- **Phase 2 (MFA Bypass attempt):** Unusual registration of a secondary virtual authentication device from an unrecognized VPN ASN (Autonomous System Number).
- **Phase 3 (Data Staging):** Local compression (tar.gz) of sensitive customer transaction ledgers, followed by a non-standard API backup call.

**Recommendation:** Correlate these actions with active physical swipe card logs to confirm if the physical user is in the building, or if this is a remote credential takeover.${contextSnippet}`;
  }

  if (lowercase.includes("report") || lowercase.includes("executive")) {
    return `### Executive Incident Summary Report
**Document ID:** SEC-REP-2026-X88
**Classification:** STRICTLY CONFIDENTIAL - TREASURY SECURITY ONLY
**Status:** DRAFT (AI-Generated Summary)

#### 1. Executive Summary
During the current cycle, SentinelX AI monitored a significant access deviation within the high-privilege corporate accounts tier. The overall behavioral drift escalated the threat level from "Nominal" to "High Warning" within a 12-minute window, primarily driven by unauthorized database queries into high-value escrow accounts.

#### 2. Key Metrics & Deviations
- **Trust Score Degradation:** Average drop of 42% across monitored privileged profiles in Treasury.
- **Confidence Rating:** 94.6% AI Confidence in behavior deviation signature.
- **Exposure Metric:** Up to $4.2M in simulated transactions queued for outbound audit.

#### 3. Recommended Actions
- Implement permanent Zero-Trust Network Access limits.
- Establish hardware-backed security keys for Swift wire transfers exceeding $100K.
- Enforce dual-authorization (four-eyes principle) on all ledger schema updates.`;
  }

  return `### Hello. I am SentinelX AI.

I am your active Security Copilot connected to the FinSpark Banking SOC. Here are the core cybersecurity topics I can assist you with:

- 📊 **Incident Forensic Analysis:** Ask me to *"Explain the current high severity alert"* or analyze specific threat markers.
- 🛡️ **Remediation Protocols:** Ask for *"mitigation steps"* or containment guidelines.
- 🌀 **Quantum Security:** Ask about *"our post-quantum readiness score"* or cryptographic migration status.
- 📝 **Audit Summarization:** Request an *"executive security report"* based on the active session log.

How can I help protect the network today?${contextSnippet}`;
}

// Vite Server Configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SentinelX Server running on port ${PORT}`);
  });
}

startServer();
