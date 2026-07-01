import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[0];

export const companyProfileSeed = [
  {
    id: "company_profile-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Company Profile",
    sourceType: "manual_seed",
    version: "1.0.0",
    tags: ["company-context", "risk-appetite", "approval-thresholds", "contracting-position"],
    content: `Northstar Cloud Intelligence (NCI) – Company Profile

Company Overview
Northstar Cloud Intelligence (NCI) is a fictional global enterprise technology company providing AI-powered workflow automation, enterprise analytics, cloud-native data platforms, and governance solutions.
NCI helps organizations modernize operations through secure, scalable, and responsible AI-enabled platforms while maintaining strong governance, operational reliability, and regulatory alignment.
The company serves enterprise and regulated customers that require secure, resilient, and globally scalable digital solutions.

Industries Served
NCI supports organizations across:
• Financial Services
• Healthcare
• Retail & E-commerce
• Manufacturing
• Technology
• Professional Services
• Logistics & Supply Chain
These industries often operate under strict operational, contractual, privacy, and compliance requirements.

Product Portfolio
Northstar AI Copilot
An enterprise AI assistant platform supporting workflow automation, document intelligence, enterprise search, and AI-assisted productivity.
Core capabilities
• Workflow automation
• Enterprise knowledge retrieval
• AI-assisted reporting
• Business process support
• Decision assistance

Northstar DataHub
A cloud-native enterprise analytics and integration platform.
Core capabilities
• Data integration
• Real-time analytics
• Business intelligence
• API connectivity
• Enterprise reporting

Northstar Governance Suite
A governance and compliance platform supporting enterprise risk, audit, policy, and operational oversight.
Core capabilities
• Governance workflows
• Risk reporting
• Compliance monitoring
• Audit support
• Operational dashboards

Global Operations
NCI operates internationally across:
• North America
• Europe
• Asia-Pacific
• Middle East
Its platforms support customers operating in multiple regulatory and contractual jurisdictions.

Business Priorities
NCI prioritizes:
1. Customer trust
2. Security and privacy
3. Responsible AI adoption
4. Reliable platform operations
5. Regulatory alignment
6. Operational resilience
7. Sustainable commercial growth
8. Long-term customer relationships

Risk Appetite
NCI maintains a moderate-to-low enterprise risk appetite.
The company generally avoids:
• unlimited or unpredictable financial exposure
• unclear operational obligations
• weak security accountability
• unmanaged compliance risk
• ambiguous ownership or governance structures
Commercial flexibility is encouraged where risks remain measurable and operationally manageable.

Contracting Philosophy
NCI seeks commercially balanced agreements that clearly allocate responsibilities between parties while supporting long-term strategic relationships.
The organization favors standardized contractual frameworks with negotiated deviations only where justified by business value and acceptable enterprise risk.

Data & Intellectual Property Principles
Unless otherwise agreed:
• customers retain ownership of customer data
• NCI retains ownership of its platforms, software, and pre-existing intellectual property
• custom deliverables should include clearly defined ownership and licensing terms

AI Governance Position
NCI promotes responsible adoption of AI-enabled technologies.
The organization expects AI-assisted systems to support:
• appropriate human oversight
• transparency of AI-enabled functionality
• protection of customer information
• governance over AI-generated outputs
• responsible handling of training data
• auditability where appropriate

Security Position
Security is considered a foundational operational requirement across NCI platforms and services.
The organization emphasizes secure platform operations, resilient infrastructure, incident preparedness, and protection of customer information across enterprise environments.

Vendor & Partnership Approach
NCI values long-term vendor and customer relationships built on:
• accountability
• operational transparency
• measurable commitments
• scalable service delivery
• responsible governance practices

Enterprise Governance Position
NCI maintains governance practices intended to support:
• operational consistency
• regulatory compliance
• scalable growth
• enterprise accountability
• responsible technology adoption
Technology-assisted review processes may support operational efficiency and consistency, while material legal and commercial decisions remain subject to human review.

Purpose of this Profile
This document provides organizational and operational context for Northstar Cloud Intelligence.
Detailed governance standards, negotiation requirements, clause guidance, risk definitions, compliance controls, and contract review policies are maintained in separate enterprise governance documents and should be referenced independently during contract analysis and risk evaluation.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.company_profile,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "company_profile",
        domains: ["Legal", "Financial", "Operational", "Compliance", "Technical"],
        contractTypes: ["MSA", "SaaS", "Vendor", "DPA", "NDA"],
        governanceArea: "enterprise_contracting_posture",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["risk appetite", "approval threshold", "preferred position", "escalation"]
      }
    }
  }
] satisfies KBSeedDocument[];
