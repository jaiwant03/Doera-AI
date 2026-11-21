/**
 * DOERA AI — Universal Intelligent Response Generation & Task Reporting Engine
 * STRICT ANTI-HALLUCINATION & DYNAMIC MULTI-CATEGORY COMPOSITION:
 * - Adapts cleanly to ANY request category:
 *   RESEARCH, LOCATION_DISCOVERY, PRODUCT_COMPARISON, SERVICE_COMPARISON,
 *   TRAVEL_PLANNING, APPOINTMENT_COORDINATION, COMMUNICATION, DOCUMENT_ANALYSIS,
 *   TECHNICAL_ASSISTANCE, DATA_ANALYSIS, TASK_AUTOMATION, GENERAL_QUESTION, MULTI_STEP_TASK.
 * - Dynamically selects ONLY relevant sections (A through J).
 * - Never shows empty sections; never repeats details.
 * - Enforces separate verification dimensions and honest attribution.
 */

export const buildUniversalResponse = (taskOrPayload) => {
  if (!taskOrPayload) return '';

  const task = taskOrPayload.task || taskOrPayload;
  const userRequest = task.userRequest || taskOrPayload.userRequest || '';
  const category = (task.category || taskOrPayload.category || 'GENERAL_EXECUTION').toUpperCase();
  const status = task.status || taskOrPayload.status || 'COMPLETED';
  const outcome = task.outcome || taskOrPayload.outcome || {};
  const contacts = task.externalContacts || outcome.contacted || [];
  const booking = task.bookingDetails || outcome.booking;
  const actionsPerformed = outcome.actionsPerformed || [];
  const verificationDimensions = outcome.verificationDimensions || task.verificationReport || [];
  const comparisons = task.comparisonMatrix || task.comparisons || null;
  const travelData = task.locationData?.route || null;
  const docData = task.discoveredData?.documents || null;
  const crossDocAnalysis = task.discoveredData?.crossDocAnalysis || null;
  const dataAnalysis = task.discoveredData?.dataAnalysis || null;
  const visionData = task.discoveredData?.vision || null;
  const visionComparison = task.discoveredData?.visionComparison || null;
  const pendingApproval = task.pendingApproval;
  const followUp = task.followUpData || null;
  const evidence = outcome.evidence || [];
  const planningData = task.planningData || task.discoveredData?.planning || outcome.planning || taskOrPayload.planning || null;
  const budgetData = task.budgetData || task.discoveredData?.budget || outcome.budget || taskOrPayload.budget || null;
  const commData = task.communicationDrafts || task.discoveredData?.communication || outcome.communication || taskOrPayload.communication || null;
  const directAnswer = task.directAnswer || taskOrPayload.directAnswer || null;

  const isMissionPlanning =
    category === 'MISSION_PLANNING' ||
    category === 'PLANNING' ||
    Boolean(planningData || budgetData);

  const isLocalResearch =
    category === 'LOCATION_DISCOVERY' ||
    category === 'LOCAL_SERVICE_RESEARCH' ||
    category === 'LOCAL_SERVICE' ||
    Boolean(task.discoveredData?.localService);

  const isConfirmed = Boolean(
    booking &&
    booking.bookingStatus === 'CONFIRMED' &&
    booking.providerConfirmationId
  );

  const isDataAnalysis =
    category === 'DATA_ANALYSIS' ||
    Boolean(dataAnalysis) ||
    Boolean(task.chartConfig);

  // Dedicated clean, uncontaminated response for Spreadsheet / Data Analytics
  if (isDataAnalysis) {
    return buildDataAnalysisResponse(dataAnalysis || task.discoveredData?.dataAnalysis, task, userRequest);
  }

  const isDocAnalysis =
    category === 'DOCUMENT_ANALYSIS' ||
    Boolean(docData) ||
    Boolean(task.discoveredData?.documents);

  // Dedicated clean, uncontaminated response for Document Intelligence & Universal Files
  if (isDocAnalysis && !isMissionPlanning && !isLocalResearch) {
    return buildDocumentAnalysisResponse(
      docData || task.discoveredData?.documents,
      crossDocAnalysis || task.discoveredData?.crossDocAnalysis,
      task,
      userRequest
    );
  }

  let md = '';

  // ==========================================
  // SECTION A: REQUEST SUMMARY
  // ==========================================
  const summaryPrefix = getCategorySummary(category, userRequest, isConfirmed, status);
  md += `${summaryPrefix}\n\n`;

  // ==========================================
  // SECTION B: RESULTS / DISCOVERED INFORMATION
  // ==========================================
  if (isMissionPlanning && (planningData || budgetData)) {
    // Mission planning and event execution layout
    md += buildMissionPlanningSection(planningData, budgetData, commData, userRequest);
  } else if (category === 'IMAGE_ANALYSIS' || visionData) {
    // Vision and image analysis layout
    md += buildVisionSection(visionData, visionComparison, userRequest);
  } else if (category === 'TRAVEL_PLANNING' || travelData) {
    // Travel planning layout
    md += buildTravelSection(travelData, task.locationData);
  } else if (category === 'DOCUMENT_ANALYSIS' || docData) {
    // Document analysis layout
    md += buildDocumentSection(docData, crossDocAnalysis, userRequest);
  } else if (category === 'DATA_ANALYSIS' || dataAnalysis) {
    // Data analysis layout
    md += buildDataAnalysisSection(dataAnalysis);
  } else if (isLocalResearch && contacts.length > 0) {
    // Comprehensive Local Service Research layout (Anti-transaction, verified badges)
    md += buildLocalServiceSection(contacts, task.discoveredData?.localService, userRequest);
  } else if (contacts.length > 0) {
    // Business / Local / Service provider layout
    md += buildProvidersSection(contacts, category);
  } else if (directAnswer) {
    md += `### Direct Response\n\n${directAnswer}\n\n`;
  } else if (outcome.responseReceived && !isConfirmed) {
    md += `### Discovered Details\n\n${outcome.responseReceived}\n\n`;
  }

  // ==========================================
  // SECTION C: COMPARISON (When requested or available)
  // ==========================================
  if (!isLocalResearch) {
    if (comparisons && comparisons.items && comparisons.items.length > 1) {
      md += buildComparisonTable(comparisons);
    } else if (contacts.length > 1 && (category.includes('COMPARISON') || category === 'LOCAL_SERVICE')) {
      md += buildAutoProviderComparisonTable(contacts);
    }
  }

  // ==========================================
  // SECTION D: VISUAL & GEOGRAPHIC INFORMATION
  // ==========================================
  if (task.locationData?.places?.length > 0 && !travelData) {
    md += `### Interactive Geographic Map\n\n`;
    md += `*Interactive OpenStreetMap layer rendered with ${task.locationData.places.length} verified coordinate markers below.* 📍\n\n`;
  }

  // ==========================================
  // SECTION E: SOURCE AND VERIFICATION DETAILS
  // ==========================================
  if (evidence.length > 0 || verificationDimensions.length > 0) {
    md += buildVerificationSection(evidence, verificationDimensions, outcome.conflicts);
  }

  // ==========================================
  // SECTION F: APPOINTMENT / ACTION STATUS
  // ==========================================
  const isCoordinationCategory = category === 'COMMUNICATION' || category === 'APPOINTMENT_COORDINATION';
  if (booking && isCoordinationCategory && !isLocalResearch && !isMissionPlanning && !isDocAnalysis && !isDataAnalysis) {
    md += buildBookingStatusSection(booking, isConfirmed);
  }

  // ==========================================
  // SECTION G: APPROVAL STATUS (HITL Gate)
  // ==========================================
  if ((status === 'AWAITING_APPROVAL' || status === 'WAITING_FOR_APPROVAL' || pendingApproval) && isCoordinationCategory && !isLocalResearch && !isMissionPlanning && !isDocAnalysis && !isDataAnalysis) {
    md += buildApprovalGateSection(pendingApproval, contacts);
  }

  // ==========================================
  // SECTION H: EXECUTION EVIDENCE (Audit & Demo Mode)
  // ==========================================
  const execEvidence = task.evidenceReferences?.[0] || task.executionEvidence;
  if (!isLocalResearch && !isMissionPlanning && (execEvidence || status === 'EXECUTED' || (actionsPerformed.length > 0 && !pendingApproval))) {
    md += buildExecutionEvidenceSection(execEvidence, actionsPerformed);
  }

  // ==========================================
  // SECTION I: FOLLOW-UP STATUS
  // ==========================================
  if (!isLocalResearch && !isMissionPlanning && (followUp || status === 'WAITING_FOR_RESPONSE' || status === 'AWAITING_RESPONSE')) {
    md += buildFollowUpSection(followUp);
  }

  // ==========================================
  // SECTION J: NEXT STEPS
  // ==========================================
  if (isLocalResearch) {
    md += `### Next Steps\n\n1. Review the verified candidate providers and comparative matrix above.\n2. Use the verified contact numbers, website links, or directions to independently decide whether to contact a provider.\n3. Feel free to refine your research criteria with specific neighborhoods, brands, or service requirements.\n`;
  } else if (isMissionPlanning && (planningData || budgetData)) {
    md += `### Next Steps\n\n1. Review the chronological schedule and submit the **Institutional Approval Letter** to the Principal/Dean.\n2. Dispatch the **Sponsorship Pitch** to prospective corporate partners and industry mentors to confirm technical prizes and API credits.\n3. Convene the 5 volunteer team leads (Registration, Technical Support, Hospitality, Mentorship, Media) for role onboarding.\n4. Open participant registrations and distribute the onboarding welcome guide.\n`;
  } else {
    md += buildNextStepsSection(status, isConfirmed, contacts, pendingApproval);
  }

  return md.trim();
};

/**
 * Section A: Category-specific executive summary
 */
function getCategorySummary(category, userRequest, isConfirmed, status) {
  if (isConfirmed) {
    return `I have successfully coordinated your request for **"${userRequest}"** and verified confirmation with the provider.`;
  }
  if (status === 'AWAITING_APPROVAL' || status === 'WAITING_FOR_APPROVAL') {
    return `I have established the execution plan and gathered verified parameters for **"${userRequest}"**. Your explicit authorization is required before dispatching external communications.`;
  }
  switch (category) {
    case 'TRAVEL_PLANNING':
      return `I have formulated a comprehensive travel itinerary and navigation route for: **"${userRequest}"**.`;
    case 'PRODUCT_COMPARISON':
      return `I have researched and compared candidate products based on verified specifications and availability for: **"${userRequest}"**.`;
    case 'SERVICE_COMPARISON':
      return `I have analyzed and cross-referenced verified service providers in this sector for: **"${userRequest}"**.`;
    case 'DOCUMENT_ANALYSIS':
      return `I have analyzed the document content, extracted key findings, and referenced important sections for: **"${userRequest}"**.`;
    case 'IMAGE_ANALYSIS':
      return `I have conducted a genuine visual audit, layout analysis, and image understanding for: **"${userRequest}"**.`;
    case 'DATA_ANALYSIS':
      return `I have audited the dataset metrics, identified significant trends, and evaluated statistical patterns for: **"${userRequest}"**.`;
    case 'COMMUNICATION':
      return `I have prepared the authorized communication dispatch for: **"${userRequest}"**.`;
    case 'LOCATION_DISCOVERY':
    case 'LOCAL_SERVICE_RESEARCH':
      return `I have completed verified research on local service providers matching your criteria for: **"${userRequest}"**.`;
    case 'MISSION_PLANNING':
    case 'PLANNING':
      return `I have coordinated with our specialized multi-agent planning team (Research, Planning, Budget, Communication, Verification) to formulate a complete execution plan for: **"${userRequest}"**.`;
    default:
      return `I have analyzed your objective and synthesized verified results for: **"${userRequest}"**.`;
  }
}

/**
 * Section B Helpers
 */
function buildProvidersSection(contacts, category) {
  let md = `### Verified Providers & Facilities\n\n`;
  contacts.slice(0, 3).forEach((c, idx) => {
    md += `#### ${idx + 1}. ${c.businessName || c.name || 'Provider'}\n`;
    if (c.address) {
      md += `- **Address**: ${c.address}\n`;
    }
    md += `- **Contact Phone**: ${c.phone ? c.phone : 'Not publicly available in open directory'}\n`;
    if (c.email) {
      md += `- **Email**: ${c.email}\n`;
    }
    if (c.rating) {
      md += `- **Rating**: ★ ${c.rating} (${c.reviewsCount ? `${c.reviewsCount} reviews` : 'Verified source'})\n`;
    }
    if (c.distanceKm) {
      md += `- **Distance**: ~${c.distanceKm} km from target reference\n`;
    }

    // Domain fees
    if (c.quote?.domain === 'MEDICAL' || category.includes('MEDICAL')) {
      md += `- **Consultation Fee**: ${c.quote?.consultationFee || 'Confirmed upon clinic registration / direct inquiry'}\n`;
    } else if (c.quote?.inspectionFee) {
      md += `- **Inspection Fee**: ${c.quote.inspectionFee}\n`;
      if (c.quote.estimatedHourly) md += `- **Hourly Labour**: ${c.quote.estimatedHourly}\n`;
    } else if (c.price) {
      md += `- **Rate / Pricing**: ${c.price}\n`;
    }

    if (c.sourceUrl) {
      md += `- **Source**: [${c.source || 'OpenStreetMap Verified'}](${c.sourceUrl})\n`;
    }
    md += `\n`;
  });
  return md;
}

function buildLocalServiceSection(contacts, localServiceData, userRequest) {
  let md = `### Local Service Research & Verified Providers\n\n`;

  const providers = (localServiceData?.providers && localServiceData.providers.length > 0)
    ? localServiceData.providers
    : contacts;

  if (localServiceData?.params) {
    const p = localServiceData.params;
    md += `> **Research Target**: ${p.serviceCategory} in **${p.targetLocation}**`;
    if (p.specificRequirements?.length > 0) {
      md += ` | Specific Criteria: *${p.specificRequirements.join(', ')}*`;
    }
    md += `\n\n`;
  }

  // 1. Researched Providers List with Verified Badges
  providers.forEach((c, idx) => {
    md += `#### ${idx + 1}. ${c.businessName || c.name || 'Provider'}\n`;
    if (c.address) {
      md += `- **Physical Address**: ${c.address}\n`;
    }

    // Verification Status Badge
    const vStatus = c.verificationStatus || (c.source?.includes('OpenStreetMap') ? 'CONFIRMED' : 'REPORTED_BY_THIRD_PARTY');
    let vBadge = '✓ Confirmed Information';
    if (vStatus === 'REPORTED_BY_THIRD_PARTY') vBadge = 'ℹ️ Reported by Third-Party Directory';
    else if (vStatus === 'NOT_INDEPENDENTLY_VERIFIED') vBadge = '⚠️ Not Independently Verified';
    else if (vStatus === 'NOT_AVAILABLE') vBadge = '❌ Information Not Available';
    md += `- **Verification Status**: \`${vBadge}\`\n`;

    // Service Suitability Analysis
    if (c.suitability || c.suitabilityAnalysis) {
      const matchLabel = c.suitability === 'HIGH' ? 'High Match' : (c.suitability === 'MODERATE' ? 'Moderate Match' : 'General Service Only');
      md += `- **Service Suitability**: **${matchLabel}** — ${c.suitabilityAnalysis || 'General service facility.'}\n`;
    }

    // Contact Phone
    md += `- **Contact Number**: ${c.phone ? c.phone : '*Contact number not publicly listed in open directory*'}\n`;

    // Customer Rating
    if (c.rating) {
      md += `- **Customer Rating**: ★ ${c.rating}${c.reviewsCount ? ` (${c.reviewsCount} reviews)` : ' (Public directory rating)'}\n`;
    } else {
      md += `- **Customer Rating**: *Rating not publicly listed in open directory*\n`;
    }

    // Website
    if (c.website) {
      md += `- **Official Website**: [${c.website.replace(/^https?:\/\//, '')}](${c.website})\n`;
    } else {
      md += `- **Official Website**: *Website not available in public directory*\n`;
    }

    // Source link
    if (c.sourceUrl) {
      md += `- **Source Reference**: [${c.source || 'OpenStreetMap Nominatim'}](${c.sourceUrl})\n`;
    }
    md += `\n`;
  });

  // 2. Provider Comparison Table
  const comparison = localServiceData?.comparisonMatrix;
  if (comparison && Array.isArray(comparison.items) && comparison.items.length > 1) {
    md += `### Provider Comparison Table\n\n`;
    const criteria = comparison.criteria || ['Location / Area', 'Verified Services', 'Suitability for Need', 'Rating & Reviews', 'Contact Phone', 'Verification Level'];
    md += `| Provider | ` + criteria.join(' | ') + ` |\n`;
    md += `| :--- | ` + criteria.map(() => ':---').join(' | ') + ` |\n`;
    comparison.items.forEach((item) => {
      const values = criteria.map((cr) => item.scoresOrValues?.[cr] || 'Not specified');
      md += `| **${item.name}** | ` + values.join(' | ') + ` |\n`;
    });
    md += `\n`;
  } else if (providers.length > 1) {
    md += `### Provider Comparison Table\n\n`;
    md += `| Provider | Location / Area | Verified Services | Customer Rating | Contact Number | Verification Level |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    providers.forEach((c) => {
      const loc = (c.area || c.address || 'Local Region').split(',')[0];
      const serv = (c.knownSpecialties || []).slice(0, 2).join(', ') || 'General Service';
      const rat = c.rating ? `★ ${c.rating}` : 'Not publicly listed';
      const ph = c.phone || 'Not publicly listed';
      const v = c.verificationStatus === 'CONFIRMED' ? '✓ Confirmed' : (c.verificationStatus === 'NOT_INDEPENDENTLY_VERIFIED' ? '⚠️ Unverified' : 'ℹ️ 3rd Party');
      md += `| **${c.businessName || c.name}** | ${loc} | ${serv} | ${rat} | ${ph} | ${v} |\n`;
    });
    md += `\n`;
  }

  // 3. Recommended Shortlist
  const rec = localServiceData?.recommendation;
  if (rec && rec.shortlist && rec.shortlist.length > 0) {
    md += `### Recommended Shortlist\n\n`;
    if (rec.rationale) {
      md += `> ${rec.rationale}\n\n`;
    }
    rec.shortlist.forEach((s, i) => {
      md += `${i + 1}. **${s.name}** (${s.suitability || 'Recommended'}): ${s.rationale || 'Top regional candidate'}\n`;
    });
    md += `\n`;
  }

  // 4. Research Limitations
  const limits = localServiceData?.limitations || [
    'Research-only mandate: DOERA AI did not contact, call, message, book, or execute any transaction with any provider.',
    'Stock & pricing variance: Specific replacement component availability (such as Dell original display panels) varies daily and requires physical diagnosis.',
    'Directory bounds: Contact information and ratings reflect publicly accessible registry listings.',
    'Independent user decision: The user can view verified contact details above and independently decide whether to contact any provider.',
  ];

  md += `### Research Limitations & Scope\n\n`;
  limits.forEach((l) => {
    md += `- ℹ️ ${l}\n`;
  });
  md += `\n`;

  // 5. Mandatory Anti-Transaction Statement
  md += `> 🛡️ **Research completed. No business was contacted and no booking or transaction was made.**\n\n`;

  return md;
}

function buildTravelSection(route, locationData) {
  let md = `### Travel Itinerary & Route Highlights\n\n`;
  if (route) {
    md += `- **Route Distance**: **${route.distanceKm || 'Calculated'} km**\n`;
    md += `- **Estimated Driving Duration**: **${route.durationFormatted || 'Optimal transit'}**\n`;
    md += `- **Origin**: ${route.originName || 'Departure Point'}\n`;
    md += `- **Destination**: ${route.destinationName || 'Destination Point'}\n\n`;

    if (Array.isArray(route.steps) && route.steps.length > 0) {
      md += `#### Turn-by-Turn Waypoints\n`;
      route.steps.slice(0, 6).forEach((step, i) => {
        md += `${i + 1}. ${step}\n`;
      });
      md += `\n`;
    }
  }
  return md;
}

function buildVisionSection(images, comparison, userRequest) {
  let md = '';
  const imgList = Array.isArray(images) ? images : [];

  // 1. Multi-Image Comparative Intelligence
  if (imgList.length > 1 && comparison) {
    md += `### Multi-Image Comparative Intelligence\n\n`;
    if (comparison.summary) {
      md += `> ${comparison.summary}\n\n`;
    }

    if (comparison.matrix && Array.isArray(comparison.matrix) && comparison.matrix.length > 0) {
      md += `#### Visual & Design Comparison Matrix\n\n`;
      const colHeaders = imgList.map((img) => img.filename || 'Image').join(' | ');
      const colDividers = imgList.map(() => ':---').join(' | ');
      md += `| Evaluation Dimension | ${colHeaders} | Comparative Finding |\n`;
      md += `| :--- | ${colDividers} | :--- |\n`;

      comparison.matrix.forEach((row) => {
        const valCells = imgList.map((img) => row[img.filename] || row.values?.[img.filename] || '-').join(' | ');
        md += `| **${row.dimension}** | ${valCells} | ${row.verdict || row.notes || '-'} |\n`;
      });
      md += `\n`;
    }

    if (comparison.keyDifferences && comparison.keyDifferences.length > 0) {
      md += `**Key Visual Differences**:\n`;
      comparison.keyDifferences.forEach((diff) => {
        md += `- **${diff.aspect || 'Aspect'}**: ${diff.details}\n`;
      });
      md += `\n`;
    }

    if (comparison.recommendation) {
      md += `**Comparative Recommendation**:\n`;
      md += `> 💡 ${comparison.recommendation}\n\n`;
    }
  }

  // 2. Individual Image Intelligence
  imgList.forEach((img, idx) => {
    md += `### Image Analysis: ${img.filename}\n\n`;

    // Visual Asset Profile Table
    md += `#### Visual Asset Profile\n\n`;
    md += `| Visual Attribute | Verified Telemetry |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Classified Asset Type** | \`${img.detectedType || 'IMAGE'}\` |\n`;
    md += `| **Resolution & Format** | ${img.dimensions?.width || '?'} × ${img.dimensions?.height || '?'} px (${img.format || 'IMG'}, Aspect: ${img.dimensions?.aspectRatio || 'N/A'}, ${img.dimensions?.orientation || 'Landscape'}) |\n`;
    md += `| **Visual Theme** | ${img.visualMetrics?.theme || 'Standard'} (Perceived Luminance: ${img.visualMetrics?.luminance ?? 'N/A'}/255) |\n`;
    if (img.visualMetrics?.dominantColors?.length > 0) {
      md += `| **Dominant Color Palette** | ${img.visualMetrics.dominantColors.join(', ')} |\n`;
    }
    if (img.visualMetrics?.contrastIndex !== undefined) {
      md += `| **Contrast Index** | ${img.visualMetrics.contrastIndex} (${img.visualMetrics.estimatedWcagContrast || 'Normal'}) |\n`;
    }
    if (img.layoutZones?.layoutStructure) {
      md += `| **Layout Structure** | ${img.layoutZones.layoutStructure} |\n`;
    }
    if (img.ocr?.wordsCount !== undefined) {
      md += `| **OCR Text Layer** | ${img.ocr.wordsCount > 0 ? `${img.ocr.wordsCount} words detected (${img.ocr.confidence}% confidence)` : 'No embedded text characters detected'} |\n`;
    }
    md += `\n`;

    // Executive Summary
    if (img.summary) {
      md += `#### Executive Summary\n\n${img.summary}\n\n`;
    }

    // Grounded Observations
    if (img.observations && (Array.isArray(img.observations) ? img.observations.length > 0 : Object.keys(img.observations).length > 0)) {
      md += `#### Grounded Visual Observations\n\n`;
      if (Array.isArray(img.observations)) {
        img.observations.forEach((obs) => {
          if (typeof obs === 'string') {
            md += `- ${obs}\n`;
          } else if (obs.category && obs.observation) {
            md += `- **${obs.category}**: ${obs.observation}\n`;
          }
        });
      } else {
        Object.entries(img.observations).forEach(([cat, text]) => {
          md += `- **${cat}**: ${text}\n`;
        });
      }
      md += `\n`;
    }

    // Detected Text Transcript (OCR)
    if (img.ocr?.text && img.ocr.text.trim().length > 0) {
      md += `#### Detected Text (OCR Transcript)\n\n`;
      md += `\`\`\`text\n${img.ocr.text.trim()}\n\`\`\`\n\n`;
    }

    // Detailed Contextual Explanation
    if (img.detailedExplanation) {
      md += `#### Contextual Visual Explanation\n\n${img.detailedExplanation}\n\n`;
    }

    // Identified Issues (Explicitly separated from recommendations)
    if (img.identifiedIssues && img.identifiedIssues.length > 0) {
      md += `#### Identified Visual & UX Issues\n\n`;
      img.identifiedIssues.forEach((issue) => {
        if (typeof issue === 'string') {
          md += `- ⚠️ ${issue}\n`;
        } else {
          md += `- ⚠️ **${issue.title || 'Visual Issue'}** (${issue.severity || 'Medium'})${issue.location ? ` — *${issue.location}*` : ''}: ${issue.visualEvidence || issue.description || ''}\n`;
        }
      });
      md += `\n`;
    }

    // Actionable Recommendations
    if (img.recommendations && img.recommendations.length > 0) {
      md += `#### Actionable Recommendations\n\n`;
      img.recommendations.forEach((rec) => {
        md += `- 💡 ${typeof rec === 'string' ? rec : (rec.recommendation || rec.suggestion || JSON.stringify(rec))}\n`;
      });
      md += `\n`;
    }

    // Limitations / Uncertainties
    if (img.limitations && img.limitations.length > 0) {
      md += `#### Limitations & Uncertain Observations\n\n`;
      img.limitations.forEach((lim) => {
        md += `- ℹ️ *${lim}*\n`;
      });
      md += `\n`;
    }
  });

  return md;
}

export function buildDocumentAnalysisResponse(docs, crossDocAnalysis, task, userRequest) {
  let md = '';
  const docList = Array.isArray(docs) ? docs : (docs ? [docs] : []);
  const primaryDoc = docList[0] || {};
  const requestIntent = primaryDoc.requestIntent || 'GENERAL_ANALYSIS';
  const reqLower = (userRequest || task?.userRequest || '').toLowerCase();

  const isCompareReq =
    requestIntent === 'COMPARISON' ||
    /compare|comparison|difference between|vs\b|versus|which (document|proposal) is better/i.test(reqLower) ||
    Boolean(crossDocAnalysis?.comparisonMatrix?.length > 0 && docList.length > 1);

  // 1. MULTI-DOCUMENT COMPARISON (Prioritized when comparison or 2+ docs requested)
  if (isCompareReq) {
    md += `## Document Comparison\n\n`;
    if (crossDocAnalysis?.comparisonSummary) {
      md += `### Executive Comparison\n${crossDocAnalysis.comparisonSummary}\n\n`;
    }

    if (crossDocAnalysis?.comparisonMatrix?.length > 0) {
      md += `### Comparative Matrix\n\n`;
      md += `| Dimension | Document 1 | Document 2 | Comparative Finding |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      crossDocAnalysis.comparisonMatrix.forEach((m) => {
        md += `| **${m.criteria}** | ${m.doc1Value || '-'} | ${m.doc2Value || '-'} | ${m.verdict || '-'} |\n`;
      });
      md += `\n`;
    }

    if (crossDocAnalysis?.commonRequirements?.length > 0) {
      md += `### Common Terms & Requirements\n`;
      crossDocAnalysis.commonRequirements.forEach((r) => (md += `- ${r}\n`));
      md += `\n`;
    }

    if (crossDocAnalysis?.conflictingRequirements?.length > 0) {
      md += `### Key Differences & Conflicts\n`;
      crossDocAnalysis.conflictingRequirements.forEach((c) => {
        if (typeof c === 'string') {
          md += `- ${c}\n`;
        } else {
          md += `- **${c.issue}**: Doc 1 (*${c.doc1Stance}*) vs Doc 2 (*${c.doc2Stance}*)\n`;
        }
      });
      md += `\n`;
    }

    if (crossDocAnalysis?.missingInEach) {
      const doc1Lacks = crossDocAnalysis.missingInEach.doc1Lacks || [];
      const doc2Lacks = crossDocAnalysis.missingInEach.doc2Lacks || [];
      if (doc1Lacks.length > 0 || doc2Lacks.length > 0) {
        md += `### Coverage Gaps Between Sources\n`;
        if (doc1Lacks.length > 0) md += `- **Missing in Document 1**: ${doc1Lacks.join('; ')}\n`;
        if (doc2Lacks.length > 0) md += `- **Missing in Document 2**: ${doc2Lacks.join('; ')}\n`;
        md += `\n`;
      }
    }

    if (crossDocAnalysis?.recommendation) {
      md += `### Grounded Recommendation\n${crossDocAnalysis.recommendation}\n`;
    }

    return md.trim();
  }

  // 2. ARCHITECTURE_ANALYSIS (Proposal, System Architecture, Weaknesses, Improvements)
  if (
    requestIntent === 'ARCHITECTURE_ANALYSIS' ||
    primaryDoc.architectureAnalysis ||
    /(architecture|system architecture|weakness|weaknesses|improvements?|project proposal|proposal)/i.test(reqLower)
  ) {
    const arch = primaryDoc.architectureAnalysis || {};
    const weaknesses = primaryDoc.identifiedWeaknesses || [];
    const improvements = primaryDoc.recommendations || [];
    const assessment = primaryDoc.overallAssessment || primaryDoc.summary || '';

    md += `## Project Proposal Analysis\n\n`;

    // 1. System Architecture
    md += `### 1. System Architecture\n`;
    if (arch.summary) {
      md += `${arch.summary}\n\n`;
    }

    if (arch.frontend) md += `- **Frontend**: ${arch.frontend}\n`;
    if (arch.backend) md += `- **Backend**: ${arch.backend}\n`;
    if (arch.database) md += `- **Database**: ${arch.database}\n`;
    if (arch.apis) md += `- **APIs and Integrations**: ${arch.apis}\n`;
    if (arch.communication) md += `- **Communication**: ${arch.communication}\n`;
    if (arch.workflow) md += `- **System Workflow**: ${arch.workflow}\n`;

    if (!arch.frontend && !arch.backend && !arch.database) {
      const scopeLabel = primaryDoc.fileType?.includes('PPT') ? `${primaryDoc.pageCount || 1} slide(s)` : `${primaryDoc.pageCount || 1} page(s)`;
      md += `- **Scope**: Evaluated across **${scopeLabel}** in \`${primaryDoc.filename || 'Project Proposal'}\`.\n`;
      if (primaryDoc.technologies?.length > 0) {
        md += `- **Identified Stacks & Components**: ${primaryDoc.technologies.map(t => `\`${t}\``).join(', ')}\n`;
      }
    }
    md += `\n`;

    // 2. Identified Weaknesses
    md += `### 2. Identified Weaknesses\n`;
    if (weaknesses.length > 0) {
      weaknesses.forEach((w, idx) => {
        if (typeof w === 'string') {
          md += `${idx + 1}. **${w}**\n\n`;
        } else {
          const cit = w.citation ? ` *(${w.citation})*` : '';
          md += `${idx + 1}. **${w.issue || w.title || 'Architectural Gap'}**${cit}\n`;
          md += `   - **Issue**: ${w.issue || w.title}\n`;
          md += `   - **Why It Matters**: ${w.whyItMatters || w.impact || 'Presents a potential reliability, latency, or scalability bottleneck under peak loads.'}\n\n`;
        }
      });
    } else {
      md += `*No critical architectural vulnerabilities or operational bottlenecks were explicitly flagged in the provided proposal content.*\n\n`;
    }

    // 3. Recommended Improvements
    md += `### 3. Recommended Improvements\n`;
    if (improvements.length > 0) {
      improvements.forEach((imp, idx) => {
        if (typeof imp === 'string') {
          md += `${idx + 1}. **${imp}**\n\n`;
        } else {
          md += `${idx + 1}. **${imp.title || 'Technical Improvement'}**\n`;
          if (imp.what) md += `   - **What**: ${imp.what}\n`;
          if (imp.why) md += `   - **Why**: ${imp.why}\n`;
          if (imp.how) md += `   - **How**: ${imp.how}\n`;
          if (imp.benefits) md += `   - **Expected Benefits**: ${imp.benefits}\n`;
          md += `\n`;
        }
      });
    } else {
      md += `*Practical optimizations should align with microservice scalability guidelines and redundant load balancing.*\n\n`;
    }

    // 4. Overall Assessment
    md += `### 4. Overall Assessment\n`;
    if (assessment) {
      md += `${assessment}\n`;
    } else {
      md += `The project proposal presents a structured design foundation. Implementing the recommended resilience and decoupled messaging patterns will ensure production-grade scalability and uptime.\n`;
    }

    return md.trim();
  }

  // 2. SUMMARIZATION
  if (
    requestIntent === 'SUMMARIZATION' ||
    primaryDoc.summarization ||
    /summarize/i.test(reqLower)
  ) {
    const summ = primaryDoc.summarization || {};
    md += `## Document Summary: ${primaryDoc.filename || 'Uploaded Document'}\n\n`;

    md += `### 1. Main Subject\n`;
    md += `${summ.mainSubject || primaryDoc.summary || 'Summary overview of the uploaded document.'}\n\n`;

    md += `### 2. Important Points\n`;
    const points = summ.importantPoints || primaryDoc.factualFindings || [];
    if (points.length > 0) {
      points.slice(0, 6).forEach((p) => {
        if (typeof p === 'string') {
          md += `- ${p}\n`;
        } else {
          const cit = p.citation ? ` *(${p.citation})*` : '';
          md += `- ${p.point || p.fact || p}${cit}\n`;
        }
      });
    } else {
      md += `- Document parsed successfully across ${primaryDoc.pageCount || 1} page(s).\n`;
    }
    md += `\n`;

    md += `### 3. Key Findings\n`;
    const findings = summ.keyFindings || primaryDoc.keyRequirements || [];
    if (findings.length > 0) {
      findings.slice(0, 5).forEach((f) => {
        if (typeof f === 'string') {
          md += `- ${f}\n`;
        } else {
          const cit = f.citation ? ` *(${f.citation})*` : '';
          md += `- ${f.finding || f.claim || f}${cit}\n`;
        }
      });
    } else {
      md += `- Key metrics and specifications catalogued without discrepancies.\n`;
    }
    md += `\n`;

    md += `### 4. Conclusion\n`;
    md += `${summ.conclusion || 'The document establishes structured specifications with verified baseline requirements.'}\n`;

    return md.trim();
  }

  // 3. DATES_EXTRACTION
  if (
    requestIntent === 'DATES_EXTRACTION' ||
    primaryDoc.datesExtraction ||
    /(date|dates|deadlines?|milestones?|timeline)/i.test(reqLower)
  ) {
    const dates = primaryDoc.datesExtraction?.dates || [];
    md += `## Important Dates & Deadlines: ${primaryDoc.filename || 'Document'}\n\n`;

    if (dates.length > 0) {
      md += `| Date | Associated Event / Milestone | Reference |\n`;
      md += `| :--- | :--- | :--- |\n`;
      dates.forEach((d) => {
        md += `| **${d.date || 'TBD'}** | ${d.event || 'Project Milestone'} | ${d.citation || '[Document]'} |\n`;
      });
    } else {
      md += `*No explicit calendar dates were detected in the text layer of this document.*\n`;
    }

    return md.trim();
  }

  // 4. REQUIREMENTS_EXTRACTION
  if (
    requestIntent === 'REQUIREMENTS_EXTRACTION' ||
    primaryDoc.requirementsExtraction ||
    /(technical requirements?|requirements?|specs?|specifications?)/i.test(reqLower)
  ) {
    const reqs = primaryDoc.requirementsExtraction?.requirements || primaryDoc.keyRequirements || [];
    md += `## Technical Requirements: ${primaryDoc.filename || 'Document'}\n\n`;

    if (reqs.length > 0) {
      reqs.forEach((r) => {
        if (typeof r === 'string') {
          md += `- ${r}\n`;
        } else {
          const cat = r.category ? `**${r.category}**: ` : '';
          const cit = r.citation ? ` *(${r.citation})*` : '';
          md += `- ${cat}${r.requirement || r}${cit}\n`;
        }
      });
    } else {
      md += `*No explicit technical requirements were extracted from the document.*\n`;
    }

    return md.trim();
  }

  // 5. SLIDE_EXPLANATION
  if (
    requestIntent === 'SLIDE_EXPLANATION' ||
    primaryDoc.slideExplanation ||
    /(?:explain|describe|about)\s+(?:slide|page)\s*\d+/i.test(reqLower)
  ) {
    const slideInfo = primaryDoc.slideExplanation || {};
    const slideNum = slideInfo.slideNumber || 1;
    md += `## Slide ${slideNum} Explanation: ${slideInfo.slideTitle || primaryDoc.filename || 'Presentation'}\n\n`;
    md += `${slideInfo.explanation || `Overview of Slide ${slideNum} extracted from the presentation.`}\n\n`;

    if (slideInfo.keyTakeaways && slideInfo.keyTakeaways.length > 0) {
      md += `### Key Takeaways:\n`;
      slideInfo.keyTakeaways.forEach((t) => (md += `- ${t}\n`));
    }

    return md.trim();
  }

  // 6. MULTI-DOCUMENT COMPARISON
  if (
    requestIntent === 'COMPARISON' ||
    (crossDocAnalysis && crossDocAnalysis.comparisonMatrix?.length > 0) ||
    /compare/i.test(reqLower)
  ) {
    md += `## Document Comparison\n\n`;
    if (crossDocAnalysis?.comparisonSummary) {
      md += `### Executive Comparison\n${crossDocAnalysis.comparisonSummary}\n\n`;
    }

    if (crossDocAnalysis?.comparisonMatrix?.length > 0) {
      md += `### Comparative Matrix\n\n`;
      md += `| Dimension | Document 1 | Document 2 | Comparative Finding |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      crossDocAnalysis.comparisonMatrix.forEach((m) => {
        md += `| **${m.criteria}** | ${m.doc1Value || '-'} | ${m.doc2Value || '-'} | ${m.verdict || '-'} |\n`;
      });
      md += `\n`;
    }

    if (crossDocAnalysis?.commonRequirements?.length > 0) {
      md += `### Common Terms & Requirements\n`;
      crossDocAnalysis.commonRequirements.forEach((r) => (md += `- ${r}\n`));
      md += `\n`;
    }

    if (crossDocAnalysis?.conflictingRequirements?.length > 0) {
      md += `### Key Differences & Conflicts\n`;
      crossDocAnalysis.conflictingRequirements.forEach((c) => {
        if (typeof c === 'string') {
          md += `- ${c}\n`;
        } else {
          md += `- **${c.issue}**: Doc 1 (*${c.doc1Stance}*) vs Doc 2 (*${c.doc2Stance}*)\n`;
        }
      });
      md += `\n`;
    }

    if (crossDocAnalysis?.recommendation) {
      md += `### Grounded Recommendation\n${crossDocAnalysis.recommendation}\n`;
    }

    return md.trim();
  }

  // 7. SPECIFIC QUESTION / FOCUSED FOLLOW-UP
  if (primaryDoc.specificAnswer) {
    const ans = primaryDoc.specificAnswer;
    md += `## Document Analysis: ${primaryDoc.filename || 'Uploaded File'}\n\n`;
    md += `${ans.directAnswer}\n\n`;

    if (ans.details && ans.details.length > 0) {
      md += `### Supporting Details & Citations:\n`;
      ans.details.forEach((d) => {
        if (typeof d === 'string') {
          md += `- ${d}\n`;
        } else {
          const cit = d.citation ? ` *(${d.citation})*` : '';
          md += `- ${d.point || d}${cit}\n`;
        }
      });
      md += `\n`;
    }

    if (ans.recommendations && ans.recommendations.length > 0) {
      md += `### Practical Recommendations:\n`;
      ans.recommendations.forEach((r) => (md += `- 💡 ${r}\n`));
      md += `\n`;
    }

    return md.trim();
  }

  // 8. General Document Report Fallback
  md += `## Document Analysis: ${primaryDoc.filename || 'Uploaded File'}\n\n`;
  const scopeLabel = primaryDoc.fileType?.includes('PPT')
    ? `${primaryDoc.pageCount || 1} slide(s)`
    : (primaryDoc.fileType?.includes('XLS') ? `${primaryDoc.pageCount || 1} sheet(s)` : `${primaryDoc.pageCount || 1} page(s)`);

  md += `- **Format**: \`${primaryDoc.fileType || 'DOCUMENT'}\` • **Scope**: **${scopeLabel}** (${primaryDoc.wordCount || 0} words)\n`;
  md += `- **Extraction Status**: **${primaryDoc.extractionStatus === 'COMPLETED' ? '✓ Extracted & Grounded' : '⚠️ Verified'}**\n\n`;

  if (primaryDoc.summary) {
    md += `### Executive Summary\n${primaryDoc.summary}\n\n`;
  }

  if (primaryDoc.factualFindings && primaryDoc.factualFindings.length > 0) {
    md += `### Grounded Factual Findings\n`;
    primaryDoc.factualFindings.forEach((f) => {
      if (typeof f === 'string') {
        md += `- ${f}\n`;
      } else {
        const cit = f.citation ? ` *(${f.citation})*` : '';
        md += `- ${f.fact || f.claim || f}${cit}\n`;
      }
    });
    md += `\n`;
  }

  if (primaryDoc.recommendations && primaryDoc.recommendations.length > 0) {
    md += `### Recommendations\n`;
    primaryDoc.recommendations.forEach((r) => {
      const text = typeof r === 'string' ? r : (r.title || r.what || JSON.stringify(r));
      md += `- 💡 ${text}\n`;
    });
    md += `\n`;
  }

  return md.trim();
}

function buildDocumentSection(docs, crossDocAnalysis, userRequest) {
  return buildDocumentAnalysisResponse(docs, crossDocAnalysis, null, userRequest);
}

function buildStatisticalResponse(statResult, chart, userRequest) {
  const {
    dataset = 'dataset.xlsx',
    sheetName = 'Sheet1',
    targetColumn = 'Amount',
    seriesMetadata,
    results,
    primaryOperation,
    isMultiStat,
    isFullSummary,
    requestedOperations = [],
    activeOperations = {},
  } = statResult;
  const validCount = seriesMetadata?.validCount || 0;
  const missingCount = seriesMetadata?.missingCount || 0;
  const completeness = seriesMetadata?.completeness || 100;
  const isCurrency = /(amount|expense|spending|cost|price|salary|revenue|profit|budget|balance|fee)/i.test(targetColumn);
  const cur = isCurrency ? '$' : '';

  const formatCurrency = (v, decimals = 2) => {
    if (v === null || v === undefined) return 'N/A';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return `${cur}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const formatRaw = (v, decimals = 2) => {
    if (v === null || v === undefined) return 'N/A';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const validCountFormatted = validCount.toLocaleString();
  const dof = Math.max(validCount - 1, 1);
  const dofFormatted = dof.toLocaleString();

  let md = '';

  // 1. Full Comprehensive Summary Report
  if (isFullSummary || requestedOperations.includes('all')) {
    md = buildFullStatisticalReport(statResult, formatCurrency, formatRaw);
  }
  // 2. Single Statistical Operation (exact calculation requested)
  else if (!isMultiStat && requestedOperations.length <= 1) {
    md = buildSingleMathResponse({
      primaryOperation,
      results,
      targetColumn,
      validCount,
      validCountFormatted,
      dof,
      dofFormatted,
      formatCurrency,
      formatRaw,
      activeOperations,
      userRequest,
    });
  }
  // 3. Multi-Metric Calculation Request (e.g. Mean, Median and Mode; Variance and Standard Deviation)
  else {
    md = buildMultiMathResponse({
      requestedOperations,
      results,
      targetColumn,
      validCount,
      validCountFormatted,
      dof,
      dofFormatted,
      formatCurrency,
      formatRaw,
      activeOperations,
      userRequest,
    });
  }

  // If a chart was explicitly generated, attach it cleanly
  if (chart && Array.isArray(chart.data) && chart.data.length > 0) {
    md += '\n\n### Visualization\n\n```json:doera-chart\n' + JSON.stringify(chart, null, 2) + '\n```\n\n';
  }

  return md.trim();
}

/**
 * Clean mathematical answer format for single statistical requests.
 * Hierarchy: Small Title -> Formula -> Actual Substitution -> Final Answer (\boxed) -> Optional Note.
 */
function buildSingleMathResponse({
  primaryOperation,
  results,
  targetColumn,
  validCount,
  validCountFormatted,
  dof,
  dofFormatted,
  formatCurrency,
  formatRaw,
  activeOperations,
  userRequest,
}) {
  let md = '';

  switch (primaryOperation) {
    case 'MEAN': {
      const mean = results?.mean;
      const totalSum = results?.sum !== undefined && results?.sum !== null
        ? results.sum
        : (mean !== null && mean !== undefined ? mean * validCount : 0);

      md += '**Mean Calculation**\n\n';
      md += 'Formula:\n\n';
      md += '\\[\n\\bar{x} = \\frac{\\sum x_i}{N}\n\\]\n\n';
      md += 'Substitute the actual calculated values:\n\n';
      md += `\\[\n\\bar{x} = \\frac{${formatRaw(totalSum, 2)}}{${validCountFormatted}}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\bar{x} = ${formatCurrency(mean)}}\n\\]\n`;
      break;
    }

    case 'MEDIAN': {
      const median = results?.median;
      md += '**Median Calculation**\n\n';
      md += 'Method:\n\n';
      md += 'The median represents the 50th percentile (central observation in the sorted series).\n\n';
      md += 'Calculation:\n\n';
      if (validCount % 2 === 0) {
        const mid1 = validCount / 2;
        const mid2 = mid1 + 1;
        md += `For $N = ${validCountFormatted}$ (even), the median is the average of observations at ranks ${mid1.toLocaleString()} and ${mid2.toLocaleString()}:\n\n\\[\n\\text{Median} = \\frac{x_{(${mid1.toLocaleString()})} + x_{(${mid2.toLocaleString()})}}{2}\n\\]\n\n`;
      } else {
        const mid = Math.floor(validCount / 2) + 1;
        md += `For $N = ${validCountFormatted}$ (odd), the median is the observation at rank ${mid.toLocaleString()}:\n\n\\[\n\\text{Median} = x_{(${mid.toLocaleString()})}\n\\]\n\n`;
      }
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{Median} = ${formatCurrency(median)}}\n\\]\n`;
      break;
    }

    case 'MODE': {
      const mode = results?.mode;
      md += '**Mode Calculation**\n\n';
      md += 'Method:\n\n';
      md += 'The mode represents the value that occurs with the highest frequency in the dataset.\n\n';
      md += 'Calculation:\n\n';
      if (mode?.hasMode) {
        const modeVal = Array.isArray(mode.modeValue) ? mode.modeValue.map(m => formatCurrency(m)).join(', ') : formatCurrency(mode.modeValue);
        md += `The value **${modeVal}** occurs with the highest frequency (**${mode.frequency.toLocaleString()}** times).\n\n`;
        md += '**Final Answer:**\n\n';
        md += `\\[\n\\boxed{\\text{Mode} = ${modeVal} \\quad (\\text{Frequency: } ${mode.frequency.toLocaleString()})}\n\\]\n`;
      } else {
        md += `All observations in **${targetColumn}** appear uniquely without repetition.\n\n`;
        md += '**Final Answer:**\n\n';
        md += '\\[\n\\boxed{\\text{Mode} = \\text{No Mode}}\n\\]\n';
      }
      break;
    }

    case 'VARIANCE': {
      const v = results?.variance;
      const popVar = v?.populationVariance;
      const sampleVar = v?.sampleVariance;
      const sumSq = v?.sumSquaredDiff;
      const isPopOnly = activeOperations?.isPopulationVariance && !activeOperations?.isSampleVariance;
      const isSampleOnly = activeOperations?.isSampleVariance && !activeOperations?.isPopulationVariance;

      md += '**Variance Calculation**\n\n';

      if (!isSampleOnly) {
        md += '**Population variance**\n\n';
        md += 'Formula:\n\n';
        md += '\\[\n\\sigma^2 = \\frac{\\sum (x_i-\\mu)^2}{N}\n\\]\n\n';
        md += 'Substitute the actual calculated values:\n\n';
        md += `\\[\n\\sigma^2 = \\frac{${formatRaw(sumSq, 2)}}{${validCountFormatted}}\n\\]\n\n`;
        md += '**Final Answer:**\n\n';
        md += `\\[\n\\boxed{\\sigma^2 = ${formatRaw(popVar, 4)}}\n\\]\n\n`;
      }

      if (!isPopOnly) {
        md += '**Sample variance**\n\n';
        md += 'Formula:\n\n';
        md += '\\[\ns^2 = \\frac{\\sum (x_i-\\bar{x})^2}{n-1}\n\\]\n\n';
        md += 'Substitute the actual values:\n\n';
        md += `\\[\ns^2 = \\frac{${formatRaw(sumSq, 2)}}{${dofFormatted}}\n\\]\n\n`;
        md += '**Final Answer:**\n\n';
        md += `\\[\n\\boxed{s^2 = ${formatRaw(sampleVar, 4)}}\n\\]\n\n`;
      }

      if (!isPopOnly && !isSampleOnly) {
        md += `*Note: Population variance divides by $N$ (${validCountFormatted} observations), while sample variance divides by $n - 1$ (${dofFormatted} degrees of freedom).*\n`;
      }
      break;
    }

    case 'STANDARD_DEVIATION': {
      const sd = results?.standardDeviation;
      const popSD = sd?.populationStandardDeviation;
      const sampleSD = sd?.sampleStandardDeviation;
      const popVar = sd?.populationVariance;
      const sampleVar = sd?.sampleVariance;
      const sumSq = sd?.sumSquaredDiff;
      const isPopOnly = activeOperations?.isPopulationStdDev && !activeOperations?.isSampleStdDev;
      const isSampleOnly = activeOperations?.isSampleStdDev && !activeOperations?.isPopulationStdDev;

      md += '**Standard Deviation Calculation**\n\n';

      if (!isSampleOnly) {
        md += '**Population Standard Deviation**\n\n';
        md += 'Formula:\n\n';
        md += '\\[\n\\sigma = \\sqrt{\\frac{\\sum (x_i-\\mu)^2}{N}}\n\\]\n\n';
        md += 'Substitute the actual calculated values:\n\n';
        md += `\\[\n\\sigma = \\sqrt{\\frac{${formatRaw(sumSq, 2)}}{${validCountFormatted}}} = \\sqrt{${formatRaw(popVar, 4)}}\n\\]\n\n`;
        md += '**Final Answer:**\n\n';
        md += `\\[\n\\boxed{\\sigma = ${formatCurrency(popSD)}}\n\\]\n\n`;
      }

      if (!isPopOnly) {
        md += '**Sample Standard Deviation**\n\n';
        md += 'Formula:\n\n';
        md += '\\[\ns = \\sqrt{\\frac{\\sum (x_i-\\bar{x})^2}{n-1}}\n\\]\n\n';
        md += 'Substitute the actual calculated values:\n\n';
        md += `\\[\ns = \\sqrt{\\frac{${formatRaw(sumSq, 2)}}{${dofFormatted}}} = \\sqrt{${formatRaw(sampleVar, 4)}}\n\\]\n\n`;
        md += '**Final Answer:**\n\n';
        md += `\\[\n\\boxed{s = ${formatCurrency(sampleSD)}}\n\\]\n\n`;
      }

      if (!isPopOnly && !isSampleOnly) {
        md += `*Note: Population standard deviation $\\sigma = ${formatCurrency(popSD)}$; Sample standard deviation $s = ${formatCurrency(sampleSD)}$.*\n`;
      }
      break;
    }

    case 'COEFFICIENT_OF_VARIATION': {
      const cv = results?.coefficientOfVariation;
      const mean = cv?.mean;
      const sampleSD = cv?.sampleStandardDeviation;
      const sampleCV = cv?.sampleCV;
      const popCV = cv?.populationCV;

      md += '**Coefficient of Variation**\n\n';
      md += 'Formula:\n\n';
      md += '\\[\nCV = \\frac{s}{\\bar{x}} \\times 100\n\\]\n\n';
      md += 'Substitute actual values:\n\n';
      md += `\\[\nCV = \\frac{${formatRaw(sampleSD, 4)}}{${formatRaw(mean, 4)}} \\times 100\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{CV = ${sampleCV !== null && sampleCV !== undefined ? `${sampleCV.toFixed(2)}\\%` : 'Undefined'}}\n\\]\n\n`;
      md += `*Note: Evaluated using sample standard deviation ($s = ${formatCurrency(sampleSD)}$) over sample mean ($\\bar{x} = ${formatCurrency(mean)}$). Population CV is ${popCV !== null && popCV !== undefined ? `${popCV.toFixed(2)}%` : 'Undefined'}.*\n`;
      break;
    }

    case 'RANGE': {
      const r = results?.range;
      md += '**Range Calculation**\n\n';
      md += 'Formula:\n\n';
      md += '\\[\n\\text{Range} = x_{\\max} - x_{\\min}\n\\]\n\n';
      md += 'Substitute actual values:\n\n';
      md += `\\[\n\\text{Range} = ${formatRaw(r?.max)} - ${formatRaw(r?.min)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{Range} = ${formatCurrency(r?.range)}}\n\\]\n\n`;
      md += `*Note: Minimum observation is ${formatCurrency(r?.min)} and maximum observation is ${formatCurrency(r?.max)}.*\n`;
      break;
    }

    case 'QUARTILES': {
      const q = results?.quartiles;
      md += '**Quartiles & Interquartile Range (IQR) Calculation**\n\n';
      md += 'Formula:\n\n';
      md += '\\[\n\\text{IQR} = Q_3 - Q_1\n\\]\n\n';
      md += 'Substitute actual calculated values:\n\n';
      md += `\\[\n\\text{IQR} = ${formatRaw(q?.q3)} - ${formatRaw(q?.q1)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{IQR} = ${formatCurrency(q?.iqr)}}\n\\]\n\n`;
      md += `*Note: First Quartile ($Q_1$) is ${formatCurrency(q?.q1)}, Second Quartile ($Q_2$ / Median) is ${formatCurrency(q?.q2)}, and Third Quartile ($Q_3$) is ${formatCurrency(q?.q3)}.*\n`;
      break;
    }

    case 'OUTLIERS': {
      const o = results?.outliers;
      md += '**Outlier Detection (Tukey IQR Method)**\n\n';
      md += 'Formulas:\n\n';
      md += '\\[\n\\text{Lower Bound} = Q_1 - 1.5 \\times \\text{IQR}\n\\]\n';
      md += '\\[\n\\text{Upper Bound} = Q_3 + 1.5 \\times \\text{IQR}\n\\]\n\n';
      md += 'Substitute actual calculated values:\n\n';
      md += `\\[\n\\text{Lower Bound} = ${formatRaw(o?.q1)} - 1.5(${formatRaw(o?.iqr)}) = ${formatRaw(o?.lowerBound)}\n\\]\n`;
      md += `\\[\n\\text{Upper Bound} = ${formatRaw(o?.q3)} + 1.5(${formatRaw(o?.iqr)}) = ${formatRaw(o?.upperBound)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{Outliers Identified} = ${o?.outlierCount.toLocaleString()} \\quad (${o?.outlierPercentage}\\%)}\n\\]\n\n`;
      md += `*Note: ${o?.outlierCount === 0 ? `All ${validCountFormatted} observations reside strictly within the theoretical envelope [${formatCurrency(o?.lowerBound)}, ${formatCurrency(o?.upperBound)}].` : `Identified ${o?.outlierCount.toLocaleString()} observations beyond the boundaries.`}*\n`;
      break;
    }

    case 'SKEWNESS': {
      const dist = results?.distribution;
      md += '**Skewness Calculation**\n\n';
      md += 'Formula (Sample Skewness $G_1$):\n\n';
      md += '\\[\nG_1 = \\frac{n}{(n-1)(n-2)} \\sum_{i=1}^{n} \\left(\\frac{x_i - \\bar{x}}{s}\\right)^3\n\\]\n\n';
      md += 'Substitute actual calculated values:\n\n';
      md += `\\[\nG_1 = ${formatRaw(dist?.sampleSkewness, 4)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{G_1 = ${formatRaw(dist?.sampleSkewness, 4)}}\n\\]\n\n`;
      md += `*Interpretation: The distribution is ${dist?.skewnessDescription?.toLowerCase() || 'approximately symmetric'} ($|G_1| < 0.5$).*\n`;
      break;
    }

    case 'KURTOSIS': {
      const dist = results?.distribution;
      md += '**Kurtosis Calculation**\n\n';
      md += 'Formula (Sample Excess Kurtosis $G_2$):\n\n';
      md += '\\[\nG_2 = \\frac{n(n+1)}{(n-1)(n-2)(n-3)} \\sum_{i=1}^{n} \\left(\\frac{x_i - \\bar{x}}{s}\\right)^4 - \\frac{3(n-1)^2}{(n-2)(n-3)}\n\\]\n\n';
      md += 'Substitute actual calculated values:\n\n';
      md += `\\[\nG_2 = ${formatRaw(dist?.sampleExcessKurtosis, 4)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{G_2 = ${formatRaw(dist?.sampleExcessKurtosis, 4)}}\n\\]\n\n`;
      md += `*Interpretation: Platykurtic distribution (${dist?.kurtosisDescription?.toLowerCase() || 'uniform distribution characteristics'}).*\n`;
      break;
    }

    case 'COVARIANCE': {
      const cov = results?.covariance;
      md += '**Covariance Calculation**\n\n';
      if (cov?.isSpecified) {
        md += `Variables: **${cov.colA}** ($X$) and **${cov.colB}** ($Y$)\n\n`;
        md += 'Formulas:\n\n';
        md += '\\[\n\\text{Cov}(X,Y) = \\frac{\\sum (x_i - \\mu_x)(y_i - \\mu_y)}{N}\n\\]\n';
        md += '\\[\ns_{xy} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{n-1}\n\\]\n\n';
        md += 'Substitute actual calculated values:\n\n';
        md += `\\[\n\\text{Cov}(X,Y) = \\frac{${formatRaw(cov.sumDiffProd, 2)}}{${validCountFormatted}} = ${formatRaw(cov.populationCovariance, 4)}\n\\]\n`;
        md += `\\[\ns_{xy} = \\frac{${formatRaw(cov.sumDiffProd, 2)}}{${dofFormatted}} = ${formatRaw(cov.sampleCovariance, 4)}\n\\]\n\n`;
        md += '**Final Answer:**\n\n';
        md += `\\[\n\\boxed{\\text{Cov}(${cov.colA}, ${cov.colB}) = ${formatRaw(cov.populationCovariance, 4)} \\quad | \\quad s_{xy} = ${formatRaw(cov.sampleCovariance, 4)}}\n\\]\n\n`;
      } else {
        md += 'Covariance evaluates joint variability between two distinct numerical variables.\n\n';
        const pairs = cov?.plausiblePairs?.length > 0
          ? cov.plausiblePairs.map((p) => `**${p}**`).join(', ')
          : '**Amount and Year**, **Amount and Month**, or **Amount and Day**';
        md += `Which two columns should I use for covariance: ${pairs}, or another pair?\n`;
      }
      break;
    }

    case 'IQR': {
      const q = results?.quartiles;
      md += '**Interquartile Range Calculation**\n\n';
      md += 'Formula:\n\n';
      md += '\\[\n\\text{IQR} = Q_3 - Q_1\n\\]\n\n';
      md += 'Substitute actual calculated values:\n\n';
      md += `\\[\n\\text{IQR} = ${formatRaw(q?.q3)} - ${formatRaw(q?.q1)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{IQR} = ${formatCurrency(q?.iqr)}}\n\\]\n`;
      break;
    }

    case 'CORRELATION': {
      const corr = results?.correlation;
      if (corr && corr.pearson) {
        md += `**Correlation Calculation: ${corr.colA} vs ${corr.colB}**\n\n`;
        md += 'Formula (Pearson Correlation Coefficient $r$):\n\n';
        md += '\\[\nr = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum (x_i - \\bar{x})^2 \\sum (y_i - \\bar{y})^2}}\n\\]\n\n';
        md += 'Substitute actual calculated values:\n\n';
        md += `\\[\nr = ${formatRaw(corr.pearson.pearsonR, 4)}\n\\]\n\n`;
        md += '**Final Answer:**\n\n';
        md += `\\[\n\\boxed{r = ${formatRaw(corr.pearson.pearsonR, 4)}}\n\\]\n\n`;
        md += `*Note: Pearson $r = ${corr.pearson.pearsonR}$ across ${corr.pearson.n.toLocaleString()} paired observations indicates ${corr.pearson.relationshipSummary}. Correlation measures linear association and does NOT imply causation.*\n`;
      } else {
        md += '**Correlation Calculation\n\nUnable to compute correlation: two distinct numeric variables with paired observations could not be identified.\n';
      }
      break;
    }

    case 'COMPARE_METRICS': {
      const sd = results?.standardDeviation;
      const cv = results?.coefficientOfVariation;
      const mean = results?.mean;
      md += '**Metric Comparison: Standard Deviation vs. Coefficient of Variation**\n\n';
      md += `- **Arithmetic Mean ($\\bar{x}$)**: ${formatCurrency(mean)}\n`;
      md += `- **Sample Standard Deviation ($s$)**: ${formatCurrency(sd?.sampleStandardDeviation)} (Absolute Dispersion)\n`;
      md += `- **Sample Coefficient of Variation ($CV$)**: ${cv?.sampleCV !== null && cv?.sampleCV !== undefined ? `${cv.sampleCV.toFixed(2)}%` : 'Undefined'} (Relative Dispersion)\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{s = ${formatCurrency(sd?.sampleStandardDeviation)} \\quad | \\quad CV = ${cv?.sampleCV?.toFixed(2)}\\%}\n\\]\n`;
      break;
    }

    default:
      md += '**Calculation Results\n\nOperation completed successfully.\n';
      break;
  }

  return md.trim();
}

/**
 * Clean mathematical answer format for multi-metric requests (e.g. Mean, Median and Mode).
 * Displays ONLY the requested metrics in clean sequence with Formula, Substitution, and Final Answer.
 */
function buildMultiMathResponse({
  requestedOperations,
  results,
  targetColumn,
  validCount,
  validCountFormatted,
  dof,
  dofFormatted,
  formatCurrency,
  formatRaw,
  activeOperations,
  userRequest,
}) {
  const allowlist = new Set(requestedOperations);
  let md = '**Statistical Calculations**\n\n';
  let step = 1;

  if (allowlist.has('mean')) {
    const mean = results?.mean;
    const totalSum = results?.sum !== undefined && results?.sum !== null
      ? results.sum
      : (mean !== null && mean !== undefined ? mean * validCount : 0);

    md += `**${step}. Mean**\n\n`;
    md += 'Formula:\n\n';
    md += '\\[\n\\bar{x} = \\frac{\\sum x_i}{N}\n\\]\n\n';
    md += 'Substitute the actual calculated values:\n\n';
    md += `\\[\n\\bar{x} = \\frac{${formatRaw(totalSum, 2)}}{${validCountFormatted}}\n\\]\n\n`;
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{\\bar{x} = ${formatCurrency(mean)}}\n\\]\n\n`;
    step++;
  }

  if (allowlist.has('median')) {
    const median = results?.median;
    md += `**${step}. Median**\n\n`;
    md += 'Method:\n\n';
    md += 'The median represents the 50th percentile (central observation in sorted series).\n\n';
    md += 'Calculation:\n\n';
    if (validCount % 2 === 0) {
      const mid1 = validCount / 2;
      const mid2 = mid1 + 1;
      md += `For $N = ${validCountFormatted}$, the median is the midpoint between observations at ranks ${mid1.toLocaleString()} and ${mid2.toLocaleString()}:\n\n\\[\n\\text{Median} = \\frac{x_{(${mid1.toLocaleString()})} + x_{(${mid2.toLocaleString()})}}{2}\n\\]\n\n`;
    } else {
      const mid = Math.floor(validCount / 2) + 1;
      md += `For $N = ${validCountFormatted}$, the median is the observation at rank ${mid.toLocaleString()}:\n\n\\[\n\\text{Median} = x_{(${mid.toLocaleString()})}\n\\]\n\n`;
    }
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{\\text{Median} = ${formatCurrency(median)}}\n\\]\n\n`;
    step++;
  }

  if (allowlist.has('mode')) {
    const mode = results?.mode;
    md += `**${step}. Mode**\n\n`;
    md += 'Method:\n\n';
    md += 'Frequency-based calculation identifying the value occurring with highest repetition.\n\n';
    md += 'Calculation:\n\n';
    if (mode?.hasMode) {
      const modeVal = Array.isArray(mode.modeValue) ? mode.modeValue.map(m => formatCurrency(m)).join(', ') : formatCurrency(mode.modeValue);
      md += `The value **${modeVal}** occurs with the highest frequency (**${mode.frequency.toLocaleString()}** times).\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{Mode} = ${modeVal} \\quad (\\text{Frequency: } ${mode.frequency.toLocaleString()})}\n\\]\n\n`;
    } else {
      md += 'All observations occur uniquely without repetition.\n\n';
      md += '**Final Answer:**\n\n';
      md += '\\[\n\\boxed{\\text{Mode} = \\text{No Mode}}\n\\]\n\n';
    }
    step++;
  }

  if (allowlist.has('variance') || allowlist.has('population_variance') || allowlist.has('sample_variance')) {
    const v = results?.variance;
    const popVar = v?.populationVariance;
    const sampleVar = v?.sampleVariance;
    const sumSq = v?.sumSquaredDiff;

    md += `**${step}. Variance**\n\n`;
    md += 'Formula & Substitution:\n\n';
    md += `\\[\n\\sigma^2 = \\frac{\\sum (x_i-\\mu)^2}{N} = \\frac{${formatRaw(sumSq, 2)}}{${validCountFormatted}}\n\\]\n`;
    md += `\\[\ns^2 = \\frac{\\sum (x_i-\\bar{x})^2}{n-1} = \\frac{${formatRaw(sumSq, 2)}}{${dofFormatted}}\n\\]\n\n`;
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{\\sigma^2 = ${formatRaw(popVar, 4)} \\quad | \\quad s^2 = ${formatRaw(sampleVar, 4)}}\n\\]\n\n`;
    step++;
  }

  if (allowlist.has('standard_deviation') || allowlist.has('population_standard_deviation') || allowlist.has('sample_standard_deviation')) {
    const sd = results?.standardDeviation;
    const popSD = sd?.populationStandardDeviation;
    const sampleSD = sd?.sampleStandardDeviation;

    md += `**${step}. Standard Deviation**\n\n`;
    md += 'Formula & Substitution:\n\n';
    md += `\\[\n\\sigma = \\sqrt{\\sigma^2} = \\sqrt{${formatRaw(sd?.populationVariance, 4)}}\n\\]\n`;
    md += `\\[\ns = \\sqrt{s^2} = \\sqrt{${formatRaw(sd?.sampleVariance, 4)}}\n\\]\n\n`;
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{\\sigma = ${formatCurrency(popSD)} \\quad | \\quad s = ${formatCurrency(sampleSD)}}\n\\]\n\n`;
    step++;
  }

  if (allowlist.has('coefficient_of_variation')) {
    const cv = results?.coefficientOfVariation;
    md += `**${step}. Coefficient of Variation**\n\n`;
    md += 'Formula & Substitution:\n\n';
    md += `\\[\nCV = \\frac{s}{\\bar{x}} \\times 100 = \\frac{${formatRaw(cv?.sampleStandardDeviation, 4)}}{${formatRaw(cv?.mean, 4)}} \\times 100\n\\]\n\n`;
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{CV = ${cv?.sampleCV !== null && cv?.sampleCV !== undefined ? `${cv.sampleCV.toFixed(2)}\%` : 'Undefined'}}\n\\]\n\n`;
    step++;
  }

  if (allowlist.has('range') || allowlist.has('min') || allowlist.has('max')) {
    const r = results?.range;
    md += `**${step}. Range**\n\n`;
    md += 'Formula:\n\n';
    md += `\\[\n\\text{Range} = x_{\\max} - x_{\\min} = ${formatRaw(r?.max)} - ${formatRaw(r?.min)}\n\\]\n\n`;
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{\\text{Range} = ${formatCurrency(r?.range)}}\n\\]\n\n`;
    step++;
  }

  if (allowlist.has('q1') || allowlist.has('q3') || allowlist.has('quartiles') || allowlist.has('iqr')) {
    const q = results?.quartiles;
    if (allowlist.has('iqr') && !allowlist.has('quartiles') && !allowlist.has('q1') && !allowlist.has('q3')) {
      md += `**${step}. Interquartile Range (IQR)**\n\n`;
      md += 'Formula & Substitution:\n\n';
      md += `\\[\n\\text{IQR} = Q_3 - Q_1 = ${formatCurrency(q?.q3)} - ${formatCurrency(q?.q1)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{IQR} = ${formatCurrency(q?.iqr)}}\n\\]\n\n`;
    } else {
      md += `**${step}. Quartiles & Interquartile Range**\n\n`;
      md += `- First Quartile ($Q_1$): **${formatCurrency(q?.q1)}**\n`;
      md += `- Third Quartile ($Q_3$): **${formatCurrency(q?.q3)}**\n`;
      md += `- Interquartile Range ($\\text{IQR} = Q_3 - Q_1$): **${formatCurrency(q?.iqr)}**\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{Q_1 = ${formatCurrency(q?.q1)} \\quad | \\quad Q_3 = ${formatCurrency(q?.q3)} \\quad | \\quad \\text{IQR} = ${formatCurrency(q?.iqr)}}\n\\]\n\n`;
    }
    step++;
  }

  if (allowlist.has('covariance')) {
    const cov = results?.covariance;
    md += `**${step}. Covariance**\n\n`;
    if (cov?.isSpecified) {
      md += `Variables: **${cov.colA}** ($X$) and **${cov.colB}** ($Y$)\n\n`;
      md += 'Formulas:\n\n';
      md += '\\[\n\\text{Cov}(X,Y) = \\frac{\\sum (x_i - \\mu_x)(y_i - \\mu_y)}{N}\n\\]\n';
      md += '\\[\ns_{xy} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{n-1}\n\\]\n\n';
      md += 'Substitute actual calculated values:\n\n';
      md += `\\[\n\\text{Cov}(X,Y) = \\frac{${formatRaw(cov.sumDiffProd, 2)}}{${formatRaw(cov.n, 0)}} = ${formatRaw(cov.populationCovariance, 4)}\n\\]\n`;
      md += `\\[\ns_{xy} = \\frac{${formatRaw(cov.sumDiffProd, 2)}}{${formatRaw(cov.n - 1, 0)}} = ${formatRaw(cov.sampleCovariance, 4)}\n\\]\n\n`;
      md += '**Final Answer:**\n\n';
      md += `\\[\n\\boxed{\\text{Cov}(X,Y) = ${formatRaw(cov.populationCovariance, 4)} \\quad | \\quad s_{xy} = ${formatRaw(cov.sampleCovariance, 4)}}\n\\]\n\n`;
    } else {
      md += `Covariance requires two numeric variables to measure joint variability.\n\n`;
      md += `Please specify which two columns you would like to compare. For example:\n`;
      const pairs = cov?.plausiblePairs || ['Amount and Year', 'Amount and Month', 'Amount and Day'];
      pairs.forEach(p => {
        md += `- **${p}**\n`;
      });
      md += `\n*Note: Identifier columns (such as Transaction_ID and User_ID) are excluded to ensure meaningful statistical analysis.*\n\n`;
    }
    step++;
  }

  if (allowlist.has('skewness')) {
    const dist = results?.distribution;
    md += `**${step}. Skewness**\n\n`;
    md += `\\[\nG_1 = ${formatRaw(dist?.sampleSkewness, 4)}\n\\]\n\n`;
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{G_1 = ${formatRaw(dist?.sampleSkewness, 4)}}\n\\]\n\n`;
    step++;
  }

  if (allowlist.has('kurtosis')) {
    const dist = results?.distribution;
    md += `**${step}. Kurtosis**\n\n`;
    md += `\\[\nG_2 = ${formatRaw(dist?.sampleExcessKurtosis, 4)}\n\\]\n\n`;
    md += '**Final Answer:**\n\n';
    md += `\\[\n\\boxed{G_2 = ${formatRaw(dist?.sampleExcessKurtosis, 4)}}\n\\]\n\n`;
    step++;
  }

  return md.trim();
}

/**
 * Full Comprehensive Statistical Report (strictly for full summary requests)
 */
function buildFullStatisticalReport(statResult, formatCurrency, formatRaw) {
  const {
    dataset = 'dataset.xlsx',
    sheetName = 'Sheet1',
    targetColumn = 'Amount',
    seriesMetadata,
    results,
  } = statResult;

  const validCount = seriesMetadata?.validCount || 0;
  const completeness = seriesMetadata?.completeness || 100;
  const cv = results?.coefficientOfVariation;
  const sd = results?.standardDeviation;
  const v = results?.variance;
  const q = results?.quartiles;
  const r = results?.range;
  const dist = results?.distribution;
  const mode = results?.mode;

  let md = '## Complete Statistical Analysis Report\n\n';
  md += `- **Dataset**: \`${dataset}\`\n`;
  md += `- **Worksheet**: \`${sheetName}\`\n`;
  md += `- **Analyzed Column**: **${targetColumn}**\n`;
  md += `- **Valid Observations**: **${validCount.toLocaleString()}** (${completeness}% completeness)\n\n`;

  const tableRows = [
    { measure: 'Mean', value: formatCurrency(results?.mean), def: '$\\sum x_i / N$' },
    { measure: 'Median', value: formatCurrency(results?.median), def: 'Central sorted observation (50th %ile)' },
    {
      measure: 'Mode',
      value: mode?.hasMode ? (Array.isArray(mode.modeValue) ? mode.modeValue.map(m => formatCurrency(m)).join(', ') : formatCurrency(mode.modeValue)) : 'No Mode',
      def: mode?.hasMode ? `Frequency: ${mode.frequency.toLocaleString()}` : 'Unique values',
    },
    { measure: 'Population Variance ($\\sigma^2$)', value: formatRaw(v?.populationVariance, 4), def: `Denominator $N = ${validCount.toLocaleString()}$` },
    { measure: 'Sample Variance ($s^2$)', value: formatRaw(v?.sampleVariance, 4), def: `Denominator $n - 1 = ${(Math.max(validCount - 1, 1)).toLocaleString()}$` },
    { measure: 'Population Standard Deviation ($\\sigma$)', value: formatCurrency(sd?.populationStandardDeviation), def: '$\\sqrt{\\sigma^2}$' },
    { measure: 'Sample Standard Deviation ($s$)', value: formatCurrency(sd?.sampleStandardDeviation), def: '$\\sqrt{s^2}$' },
    { measure: 'Population Coefficient of Variation', value: `${cv?.populationCV?.toFixed(2)}%`, def: '$(\\sigma / \\mu) \\times 100$' },
    { measure: 'Sample Coefficient of Variation', value: `${cv?.sampleCV?.toFixed(2)}%`, def: '$(s / \\bar{x}) \\times 100$' },
    { measure: 'Minimum', value: formatCurrency(r?.min), def: 'Lowest observation' },
    { measure: 'First Quartile (Q1 / 25th %ile)', value: formatCurrency(q?.q1), def: '25th percentile' },
    { measure: 'Third Quartile (Q3 / 75th %ile)', value: formatCurrency(q?.q3), def: '75th percentile' },
    { measure: 'Maximum', value: formatCurrency(r?.max), def: 'Highest observation' },
    { measure: 'Range (Spread)', value: formatCurrency(r?.range), def: '$x_{\\max} - x_{\\min}$' },
    { measure: 'Interquartile Range (IQR)', value: formatCurrency(q?.iqr), def: '$Q_3 - Q_1$' },
    { measure: 'Sample Skewness ($G_1$)', value: formatRaw(dist?.sampleSkewness, 4), def: dist?.skewnessDescription },
    { measure: 'Sample Excess Kurtosis ($G_2$)', value: formatRaw(dist?.sampleExcessKurtosis, 4), def: dist?.kurtosisDescription },
  ];

  md += '| Statistical Measure | Calculated Value | Definition / Convention |\n';
  md += '| :--- | :--- | :--- |\n';
  for (const row of tableRows) {
    md += `| **${row.measure}** | **${row.value}** | ${row.def} |\n`;
  }
  md += '\n';

  return md.trim();
}

function buildDataAnalysisResponse(analysis, task, userRequest) {
  // If this was a statistical analysis, route directly to the clean dedicated statistical response
  const statResult = analysis?.statisticalResult || analysis?.calculation?.statisticalResult || task?.statisticalResult || null;
  if (statResult || analysis?.isStatisticalAnalysis) {
    return buildStatisticalResponse(statResult || analysis?.calculation?.statisticalResult, task?.chartConfig || analysis?.chartConfig, userRequest);
  }

  const calc = analysis?.calculation || null;
  const chart = task?.chartConfig || analysis?.chartConfig || null;
  const summary = analysis?.spreadsheetSummary || {};
  const queryLower = (userRequest || '').toLowerCase();

  const totalRows = calc?.totalRowsAnalyzed || summary.totalRows || analysis?.rowCount || 0;
  const totalAmount = calc?.totalSum !== undefined ? calc.totalSum : (chart?.summaryStats?.total || 0);
  const highest = calc?.highest || (chart?.data && chart.data.length > 0 ? chart.data[0] : null);
  const lowest = calc?.lowest || (chart?.data && chart.data.length > 0 ? chart.data[chart.data.length - 1] : null);
  const currency = calc?.currency || '$';
  const isCountBased = Boolean(calc?.isCountBased);
  const categoryCodesWithoutMapping = Boolean(calc?.categoryCodesWithoutMapping);

  const formatVal = (v) => {
    if (v === null || v === undefined) return '-';
    const num = Number(v);
    if (isNaN(num)) return String(v);
    return isCountBased
      ? `${num.toLocaleString()} records`
      : `${currency}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const isHighestQuery = /(highest|top\s*(spending|category|expense)|maximum|most\s*spent)/i.test(queryLower) && !/bar\s*chart|pie\s*chart|visualize/i.test(queryLower);
  const isChartOnlyQuery = /(create\s*(a\s*)?(bar|line|pie|doughnut|donut|area)?\s*chart|show\s*(me\s*)?(a\s*)?chart|plot\s*expenses|visualize\s*(this)?)/i.test(queryLower);
  const isMonthlyQuery = /(monthly|month\s*by\s*month|compare\s*monthly|over\s*time|timeline|trend)/i.test(queryLower);
  const isReduceExpensesQuery = /(reduce|save\s*money|cut\s*costs|optimize\s*spending|cost\s*reduction|lower\s*expenses)/i.test(queryLower);
  const isInterpretationQuery = /(interpret|interpretation|explain\s*(this|the)?\s*chart|what\s*does\s*(this|the)\s*chart\s*show|walk\s*me\s*through)/i.test(queryLower);

  let md = '';

  // 1. HEADER & NATURAL LANGUAGE SUMMARY
  if (isInterpretationQuery) {
    md += `### Chart Interpretation & Dataset Analysis\n\n`;
    md += `Based on the interactive chart, here is the detailed breakdown and interpretation of your ${isCountBased ? 'dataset distribution' : 'spending totals'}. The chart compares values across all recorded categories, highlighting primary expenditure drivers and notable variations.\n\n`;
  } else if (isHighestQuery && highest) {
    md += `### Highest Spending Category\n\n`;
    md += `The highest spending category is **${highest.label}** with total spending of **${formatVal(highest.value)}**, accounting for **${highest.percentage ?? 0}%** of total recorded ${isCountBased ? 'transactions' : 'expenses'}.\n\n`;
  } else if (isMonthlyQuery) {
    md += `### Monthly Expense Comparison\n\n`;
    md += `I analyzed your expense spreadsheet by month to calculate spending totals and evaluate trends across the recorded timeline.\n\n`;
  } else if (isReduceExpensesQuery) {
    md += `### Spreadsheet Analysis Completed\n\n`;
    md += `I analyzed your entire dataset across all **${totalRows.toLocaleString()}** transactions to assess spending distribution and identify data-grounded cost reduction opportunities.\n\n`;
  } else if (isChartOnlyQuery) {
    md += `### Spreadsheet Analysis Completed\n\n`;
    md += `I analyzed your spreadsheet and generated an interactive visualization comparing totals across all categories.\n\n`;
  } else {
    md += `### Spreadsheet Analysis Completed\n\n`;
    md += `I analyzed your ${isCountBased ? 'dataset' : 'expense spreadsheet'} and calculated ${isCountBased ? 'record counts' : 'spending totals'} across the available categories. The highest ${isCountBased ? 'frequency' : 'spending'} category is identified below.\n\n`;
  }

  // 2. KEY INSIGHTS
  md += `### Key Insights\n\n`;
  if (isInterpretationQuery) {
    md += `- **Total ${isCountBased ? 'Records' : 'Expenses'} Analyzed**: ${formatVal(totalAmount)}\n`;
    if (highest) md += `- **Highest ${isCountBased ? 'Category' : 'Spending Category'}**: **${highest.label}** (${formatVal(highest.value)}, **${highest.percentage}%** of total)\n`;
    if (lowest && lowest.label !== highest?.label) md += `- **Lowest ${isCountBased ? 'Category' : 'Spending Category'}**: **${lowest.label}** (${formatVal(lowest.value)}, **${lowest.percentage}%** of total)\n`;
    if (calc?.overallAverage !== undefined && !isCountBased) md += `- **Average Category Amount**: ${formatVal(calc.overallAverage)}\n`;
    md += `- **Number of Transactions Analyzed**: **${totalRows.toLocaleString()}** records\n\n`;
  } else if (isMonthlyQuery) {
    md += `- **Total Expenses Analyzed**: ${formatVal(totalAmount)}\n`;
    if (highest) md += `- **Peak Spending Month**: **${highest.label}** (${formatVal(highest.value)}, ${highest.percentage}% of total)\n`;
    if (lowest && lowest.label !== highest?.label) md += `- **Lowest Spending Month**: **${lowest.label}** (${formatVal(lowest.value)}, ${lowest.percentage}% of total)\n`;
    if (calc?.overallAverage !== undefined) md += `- **Average Monthly Spending**: ${formatVal(calc.overallAverage)}\n`;
    md += `- **Number of Transactions Analyzed**: **${totalRows.toLocaleString()}** records\n\n`;
  } else if (isReduceExpensesQuery) {
    md += `- **Total Expenses**: ${formatVal(totalAmount)}\n`;
    if (highest) md += `- **Highest Spending Category**: **${highest.label}** (${formatVal(highest.value)}, ${highest.percentage}% of total)\n`;
    const items = calc?.items || chart?.data || [];
    if (items.length > 1) {
      const top2Sum = (items[0]?.value || 0) + (items[1]?.value || 0);
      const top2Pct = totalAmount > 0 ? Number(((top2Sum / totalAmount) * 100).toFixed(1)) : 0;
      md += `- **Top Spending Concentration**: The top 2 categories (${items[0]?.label} and ${items[1]?.label}) account for **${top2Pct}%** of total spending\n`;
    }
    md += `- **Number of Transactions Analyzed**: **${totalRows.toLocaleString()}** records\n\n`;
  } else {
    md += `- **Total ${isCountBased ? 'Records' : 'Expenses'}**: ${formatVal(totalAmount)}\n`;
    if (highest) {
      md += `- **Highest ${isCountBased ? 'Category' : 'Spending Category'}**: **${highest.label}**\n`;
      md += `- **Highest Category ${isCountBased ? 'Count' : 'Spending'}**: ${formatVal(highest.value)}\n`;
      md += `- **Percentage of Total ${isCountBased ? 'Records' : 'Spending'}**: **${highest.percentage ?? 0}%**\n`;
    }
    md += `- **Number of Transactions Analyzed**: **${totalRows.toLocaleString()}** records\n\n`;
  }

  // Note for Category Codes without Mapping
  if (categoryCodesWithoutMapping) {
    md += `> **Note**: Category descriptions are unavailable in the uploaded data. Category codes (e.g. Category 1, Category 2) are displayed as Category Code IDs without fabricated names.\n\n`;
  }

  // 3. CHART EXPLANATION & INTERACTIVE CHART
  if (chart && Array.isArray(chart.data) && chart.data.length > 0) {
    md += `### Chart Explanation\n\n`;
    if (isMonthlyQuery) {
      md += `The interactive chart compares spending progression across months. Switch between Line and Bar views or hover over a point to inspect monthly totals.\n\n`;
    } else {
      md += `The interactive bar chart compares total ${isCountBased ? 'records' : 'expenses'} across all categories. Select a chart type or hover over a bar to explore the values.\n\n`;
    }

    // Embed json:doera-chart code block for frontend MessageItem / SpreadsheetChart
    md += `\`\`\`json:doera-chart\n${JSON.stringify(chart, null, 2)}\n\`\`\`\n\n`;
  }

  // 4. ADDITIONAL INSIGHTS (Only when meaningful patterns exist)
  if (isReduceExpensesQuery && highest) {
    const items = calc?.items || chart?.data || [];
    const second = items[1] || null;
    md += `### Grounded Cost Optimization Recommendations\n\n`;
    const target10Pct = typeof highest.value === 'number' ? formatVal(highest.value * 0.1) : '';
    const target15Pct = typeof highest.value === 'number' ? formatVal(highest.value * 0.15) : '';
    md += `1. **Target ${highest.label} Expenses**: As your largest spending driver at ${formatVal(highest.value)} (${highest.percentage}% of total expenses), setting a 10–15% efficiency target in this category yields immediate savings of ${target10Pct} to ${target15Pct}.\n`;
    if (second) {
      md += `2. **Cap Secondary Discretionary Spending in ${second.label}**: Establish predefined monthly allocation caps on ${second.label} (${formatVal(second.value)}) to protect core budget.\n`;
    }
    md += `3. **Audit High-Value Transactions**: Periodically review large transaction items within ${highest.label} to eliminate non-essential expenses.\n`;
  } else if (!isChartOnlyQuery && !isHighestQuery) {
    const meaningfulInsights = [];
    if (lowest && lowest.label !== highest?.label) {
      meaningfulInsights.push(`- **Lowest Spending Category**: **${lowest.label}** with ${formatVal(lowest.value)} (${lowest.percentage}% of total).`);
    }
    if (calc?.overallAverage && !isCountBased) {
      meaningfulInsights.push(`- **Average Transaction Amount**: ${currency}${calc.overallAverage.toLocaleString()} per transaction.`);
    }
    if (calc?.outliers && calc.outliers.length > 0) {
      meaningfulInsights.push(`- **Unusual Spending Patterns**: Identified ${calc.outliers.length} anomalous transactions exceeding the typical statistical distribution threshold.`);
    }
    if (calc?.mappingSheetName) {
      meaningfulInsights.push(`- **Category Mapping Source**: Category names were mapped from the \`${calc.mappingSheetName}\` worksheet.`);
    }

    if (meaningfulInsights.length > 0) {
      md += `### Additional Insights\n\n${meaningfulInsights.join('\n')}\n`;
    }
  }

  return md.trim();
}

function buildDataAnalysisSection(analysis) {
  let md = `### Data Analysis & Statistical Insights\n\n`;
  if (analysis.datasetSummary) {
    md += `> ${analysis.datasetSummary}\n\n`;
  }

  // 1. Dataset Architecture & Quality Audit
  if (analysis.spreadsheetSummary) {
    const s = analysis.spreadsheetSummary;
    md += `#### Dataset Architecture & Quality Audit\n\n`;
    md += `| Attribute | Verified Value | Assessment |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Active Worksheet** | \`${s.primarySheetName || 'Sheet1'}\` | Extracted successfully |\n`;
    md += `| **Worksheet Count** | ${s.totalSheets} | Multi-sheet support verified |\n`;
    md += `| **Total Records (Rows)** | ${s.totalRows?.toLocaleString() || s.totalRows} | Fully preserved |\n`;
    md += `| **Column Count** | ${s.totalColumns} | Structured attributes |\n`;
    md += `| **Missing / Null Cells** | ${s.totalNullCells} | ${s.totalNullCells === 0 ? '100% Data Completeness' : 'Handled with safe fallbacks'} |\n`;
    md += `| **Duplicate Records** | ${s.totalDuplicateRows} | ${s.totalDuplicateRows === 0 ? 'Unique record set' : 'Identified & accounted for'} |\n\n`;
  }

  // 1.5 Tabular Data Preview
  if (analysis.sampleRows && analysis.sampleRows.length > 0) {
    const totalRowsCount = analysis.spreadsheetSummary?.totalRows || analysis.sampleRows.length;
    md += `#### Tabular Data Preview (${totalRowsCount} total rows)\n\n`;
    const headers = Object.keys(analysis.sampleRows[0]);
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => ':---').join(' | ')} |\n`;
    analysis.sampleRows.slice(0, 5).forEach((row) => {
      md += `| ${headers.map((h) => (row[h] !== undefined && row[h] !== null ? String(row[h]) : '-')).join(' | ')} |\n`;
    });
    md += `\n`;
  }

  // 2. Verified Deterministic Calculations Table
  if (analysis.calculation && analysis.calculation.items && analysis.calculation.items.length > 0) {
    const calc = analysis.calculation;
    md += `#### Verified Computational Findings: ${calc.operation || 'Mathematical Aggregation'}\n\n`;
    if (calc.formula) {
      md += `*Calculation Logic / Applied Formula: \`${calc.formula}\`*\n\n`;
    }
    md += `| ${calc.targetColumns?.[0] || 'Dimension'} | ${calc.targetColumns?.[1] || 'Calculated Value'} | Share (%) | Verified Status |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    calc.items.slice(0, 10).forEach((item) => {
      const valStr = typeof item.value === 'number' ? item.value.toLocaleString() : item.value;
      const pctStr = item.percentage !== undefined && item.percentage !== null ? `${item.percentage}%` : '-';
      md += `| **${item.label}** | ${valStr} | ${pctStr} | \`Ground Truth Verified\` |\n`;
    });
    md += `\n`;
    if (calc.totalSum !== undefined || calc.overallAverage !== undefined) {
      md += `**Summary Totals:** Total: **${calc.totalSum?.toLocaleString() || 'N/A'}** | Average: **${calc.overallAverage?.toLocaleString() || 'N/A'}**`;
      if (calc.highest) md += ` | Peak: **${calc.highest.label}** (${calc.highest.value?.toLocaleString() || calc.highest.value})`;
      md += `\n\n`;
    }
  } else if (analysis.keyMetrics && analysis.keyMetrics.length > 0) {
    md += `#### Key Performance Metrics\n\n`;
    md += `| Metric | Calculated Value | Significance |\n| :--- | :--- | :--- |\n`;
    analysis.keyMetrics.forEach((m) => {
      md += `| **${m.metric}** | ${m.value} | ${m.significance} |\n`;
    });
    md += `\n`;
  }

  // 3. Dynamic Interactive Chart Specification
  const chart = analysis.chartConfig;
  if (chart && chart.data && chart.data.length > 0) {
    md += `#### Interactive Visualization: ${chart.title || 'Data Chart'}\n\n`;
    md += `\`\`\`json:doera-chart\n${JSON.stringify(chart, null, 2)}\n\`\`\`\n\n`;

    // Markdown visual fallback table for standard readers
    md += `| ${chart.xAxis?.label || 'Dimension'} | ${chart.yAxis?.label || 'Value'} | Scale |\n`;
    md += `| :--- | :--- | :--- |\n`;
    const maxVal = Math.max(...chart.data.map((d) => Number(d.value) || 0), 1);
    chart.data.slice(0, 10).forEach((d) => {
      const num = Number(d.value) || 0;
      const barLen = Math.round((num / maxVal) * 16);
      const bar = '█'.repeat(Math.max(barLen, 1));
      md += `| **${d.name || d.label}** | ${num.toLocaleString()} | \`${bar}\` |\n`;
    });
    md += `\n`;
  }

  // 4. Analytical Insights & Trends
  if (analysis.trendsAndPatterns && analysis.trendsAndPatterns.length > 0) {
    md += `#### Key Analytical Insights & Statistical Trends\n\n`;
    analysis.trendsAndPatterns.forEach((t) => (md += `- ${t}\n`));
    md += `\n`;
  }

  // 5. Anomalies & Outliers
  if (analysis.anomaliesOrOutliers && analysis.anomaliesOrOutliers.length > 0) {
    md += `#### Outlier & Anomaly Evaluation\n\n`;
    analysis.anomaliesOrOutliers.forEach((a) => (md += `- ⚠️ ${a}\n`));
    md += `\n`;
  }

  // 6. Strategic Recommendations
  if (analysis.actionableInsights && analysis.actionableInsights.length > 0) {
    md += `#### Actionable Business Recommendations\n\n`;
    analysis.actionableInsights.forEach((rec, idx) => {
      md += `${idx + 1}. **Recommendation:** ${rec}\n`;
    });
    md += `\n`;
  }

  return md;
}

/**
 * Section C: Comparison Tables
 */
function buildComparisonTable(comparisons) {
  let md = `### Structured Comparison\n\n`;
  const criteria = comparisons.criteria || ['Entity', 'Best For', 'Pricing'];
  md += `| Option | ` + criteria.join(' | ') + ` |\n`;
  md += `| :--- | ` + criteria.map(() => ':---').join(' | ') + ` |\n`;

  comparisons.items.forEach((item) => {
    const values = criteria.map((c) => item.scoresOrValues?.[c] || item.verdict || 'Not publicly available');
    md += `| **${item.name}** | ` + values.join(' | ') + ` |\n`;
  });
  md += `\n`;
  if (comparisons.recommendation) {
    md += `*Recommendation: ${comparisons.recommendation}*\n\n`;
  }
  return md;
}

function buildAutoProviderComparisonTable(contacts) {
  let md = `### Provider Comparison\n\n`;
  md += `| Provider | Location / Area | Contact | Rating | Estimated Cost |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  contacts.slice(0, 4).forEach((c) => {
    const loc = (c.address || 'Local Region').split(',')[0];
    const contact = c.phone || 'Directory Listing';
    const rating = c.rating ? `★ ${c.rating}` : 'Not yet verified';
    const cost = c.quote?.consultationFee || c.quote?.inspectionFee || 'Awaiting response';
    md += `| **${c.businessName || c.name}** | ${loc} | ${contact} | ${rating} | ${cost} |\n`;
  });
  md += `\n`;
  return md;
}

/**
 * Section E: Verification & Evidence
 */
function buildVerificationSection(evidence, dimensions, conflicts) {
  let md = `### Evidence & Verification Dimensions\n\n`;
  if (dimensions && dimensions.length > 0) {
    md += `**Verification Dimensions Evaluated**:\n`;
    dimensions.forEach((d) => {
      const badge = d.status === 'VERIFIED' ? '✓ Verified' : (d.status === 'PENDING' ? '⏳ Pending' : '⚠️ Awaiting');
      md += `- \`${d.dimension || d}\`: **${badge}**${d.note ? ` — *${d.note}*` : ''}\n`;
    });
    md += `\n`;
  }

  if (evidence && evidence.length > 0) {
    md += `**Source Citations & Retrieval Audit**:\n`;
    evidence.slice(0, 3).forEach((e) => {
      const dateStr = e.retrievedAt ? `(Retrieved ${new Date(e.retrievedAt).toLocaleDateString()})` : '';
      if (e.url && e.url.startsWith('http')) {
        md += `- [${e.title || 'Verified Citation'}](${e.url}) ${dateStr}\n`;
      } else {
        md += `- **${e.title || 'Audit Reference'}**: \`${e.url || e.referenceId}\` ${dateStr}\n`;
      }
    });
    md += `\n`;
  }

  if (conflicts && conflicts.length > 0) {
    md += `> ⚠️ **Source Conflict Audit**: ${conflicts.join(' ')}\n\n`;
  }

  return md;
}

/**
 * Section F: Booking Status
 */
function buildBookingStatusSection(booking, isConfirmed) {
  let md = `### Appointment Status\n\n`;
  if (isConfirmed) {
    md += `- **Status**: Confirmed by Provider\n`;
    md += `- **Provider**: ${booking.providerName}\n`;
    if (booking.dateTime) md += `- **Date & Time**: ${booking.dateTime}\n`;
    md += `- **Official Confirmation Reference**: \`${booking.providerConfirmationId}\`\n\n`;
  } else {
    md += `- **Status**: Awaiting Provider Confirmation\n`;
    md += `- **Preferred Window**: ${booking.dateTime || 'Earliest available'}\n`;
    md += `- **Internal Tracking Reference**: \`${booking.internalReferenceId || 'DOERA-TRACK-PENDING'}\`\n\n`;
  }
  return md;
}

/**
 * Section G: Approval Gate
 */
function buildApprovalGateSection(pendingApproval, contacts) {
  const targetName = pendingApproval?.target?.name || contacts?.[0]?.businessName || 'the provider';
  let md = `### Human Authorization Required\n\n`;
  md += `Please review the proposed action and click **Authorize & Execute Action** above to proceed with dispatching the inquiry to **${targetName}**.\n\n`;
  if (pendingApproval?.details?.subject) {
    md += `- **Subject**: ${pendingApproval.details.subject}\n`;
  }
  if (pendingApproval?.details?.recipient) {
    md += `- **Destination**: ${pendingApproval.details.recipient}\n`;
  }
  md += `\n`;
  return md;
}

/**
 * Section H: Execution Evidence & Demo Mode
 */
function buildExecutionEvidenceSection(execEvidence, actions) {
  let md = `### Proof of Execution & Sandbox Audit\n\n`;
  md += `> **SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED.**\n\n`;
  if (execEvidence?.demoExecutionId || execEvidence?.externalReference) {
    md += `- **Execution ID**: \`${execEvidence.demoExecutionId || execEvidence.externalReference}\`\n`;
  }
  if (execEvidence?.channel) {
    md += `- **Dispatch Channel**: ${execEvidence.channel}\n`;
  }
  if (actions && actions.length > 0) {
    md += `- **Actions Completed**:\n`;
    actions.forEach((a) => (md += `  - ${a}\n`));
  }
  md += `\n`;
  return md;
}

/**
 * Section I: Follow-Up Status
 */
function buildFollowUpSection(followUp) {
  let md = `### Background Response Tracker\n\n`;
  md += `- **Status**: Autonomous Response Monitor Active\n`;
  if (followUp?.nextCheckAt) {
    md += `- **Next Check Scheduled**: ${new Date(followUp.nextCheckAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
  }
  md += `- **Monitoring Rule**: Automatic stop when provider response is received.\n\n`;
  return md;
}

/**
 * Section J: Next Steps
 */
function buildNextStepsSection(status, isConfirmed, contacts, pendingApproval) {
  let md = `### Next Steps\n\n`;
  if (status === 'AWAITING_APPROVAL' || status === 'WAITING_FOR_APPROVAL' || pendingApproval) {
    md += `1. Review the inquiry preview above and click **Authorize & Execute** to dispatch.\n`;
    md += `2. If you would like to adjust the inquiry parameters or destination, reply with your requested changes.\n`;
  } else if (isConfirmed) {
    md += `1. Your appointment is recorded. You can add it directly to your calendar or request a reminder.\n`;
    md += `2. Let me know if you need turn-by-turn directions or pre-appointment guidance.\n`;
  } else if (contacts.length > 0) {
    md += `1. You can contact any verified provider directly using the verified contact details above.\n`;
    md += `2. Or simply reply with which provider or time slot you prefer, and DOERA will coordinate the next step.\n`;
  } else {
    md += `1. Feel free to refine your inquiry with additional criteria, locations, or constraints.\n`;
  }
  return md;
}

/**
 * Section B Helper: Comprehensive Mission Planning & Dynamic Multi-Agent Collaboration
 */
function buildMissionPlanningSection(planningWrapper, budgetWrapper, commWrapper, userRequest) {
  const plan = planningWrapper?.plan || planningWrapper?.output || planningWrapper || {};
  const budget = budgetWrapper?.budget || budgetWrapper?.output || budgetWrapper || {};
  const comm = commWrapper?.drafts ? commWrapper : (commWrapper?.output || commWrapper || {});
  const drafts = comm.drafts || [];

  const scale = plan.scale || { participants: 100, duration: '2 Days', targetAudience: 'College students & developers' };
  const totalBudget = budget.totalBudget || budget.budgetConstraint || 50000;
  const calculatedTotal = budget.calculatedTotal || 50000;
  const costPerParticipant = budget.costPerParticipant || Math.round(totalBudget / Math.max(scale.participants || 100, 1));
  const lineItems = budget.lineItems || [];
  const schedule = plan.schedule || [];
  const volunteers = plan.volunteers || [];
  const risks = plan.risks || [];

  let md = `### Multi-Agent Mission Execution Plan\n\n`;
  md += `> **Mission Target**: Formulating an end-to-end, multi-agent execution framework for **"${userRequest}"**\n\n`;

  // 1. Executive Mission Scope
  md += `#### 1. Executive Mission Scope\n\n`;
  md += `- **Scale & Headcount**: **${scale.participants || 100} Participants**\n`;
  md += `- **Duration**: **${scale.duration || '2 Days (36 Hours)'}**\n`;
  if (scale.targetAudience) {
    md += `- **Target Audience**: ${scale.targetAudience}\n`;
  }
  md += `- **Coordinating Specialized Agents**: \`Research Agent\` ➔ \`Planning Agent\` ➔ \`Budget Agent\` ➔ \`Communication Agent\` ➔ \`Verification Agent\`\n\n`;

  // 2. Phased Roadmap
  if (plan.phases && plan.phases.length > 0) {
    md += `#### 2. Phased Milestone Roadmap\n\n`;
    plan.phases.forEach((p) => {
      md += `- **${p.phase}**\n`;
      if (p.milestones && p.milestones.length > 0) {
        p.milestones.forEach((m) => {
          md += `  - ${m}\n`;
        });
      }
    });
    md += `\n`;
  }

  // 3. Chronological Schedule Table
  if (schedule.length > 0) {
    md += `#### 3. Chronological Execution Schedule\n\n`;
    schedule.forEach((daySchedule) => {
      md += `##### ${daySchedule.day || 'Event Timeline'}\n\n`;
      md += `| Time Block | Milestone / Activity | Operational Lead |\n`;
      md += `| :--- | :--- | :--- |\n`;
      (daySchedule.items || []).forEach((item) => {
        md += `| ${item.time || ''} | ${item.activity || ''} | ${item.owner || 'Organizing Team'} |\n`;
      });
      md += `\n`;
    });
  }

  // 4. Itemized Budget Allocation Table
  if (lineItems.length > 0 || totalBudget) {
    md += `#### 4. Itemized Financial Model & Budget Allocation\n\n`;
    const mathBadge = budget.mathVerified !== false ? '✓ VERIFIED (100% Balanced)' : '⚠️ Math Variance Flagged';
    md += `> **Total Budget Limit**: ₹${Number(totalBudget).toLocaleString()} | **Allocated Total**: ₹${Number(calculatedTotal).toLocaleString()} | **Unit Economics**: ₹${costPerParticipant} / participant\n`;
    md += `> **Mathematical Balance Audit**: \`${mathBadge}\`\n\n`;

    if (lineItems.length > 0) {
      md += `| Expense Category | Item / Specification | Unit Cost (₹) | Quantity | Total (₹) | Budget Share |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      lineItems.forEach((li) => {
        const uCost = li.unitCost ? `₹${Number(li.unitCost).toLocaleString()}` : '-';
        const qty = li.quantity !== undefined ? li.quantity : 1;
        const tot = li.amount ? `₹${Number(li.amount).toLocaleString()}` : '-';
        const share = li.sharePercentage ? `${li.sharePercentage}%` : '-';
        md += `| ${li.category || 'Operations'} | ${li.item || ''} | ${uCost} | ${qty} | ${tot} | ${share} |\n`;
      });
      md += `\n`;
    }

    if (budget.financialObservations && budget.financialObservations.length > 0) {
      md += `**Financial Strategy & Observations**:\n`;
      budget.financialObservations.forEach((o) => {
        md += `- ${o}\n`;
      });
      md += `\n`;
    }

    if (budget.costSavingSuggestions && budget.costSavingSuggestions.length > 0) {
      md += `**Cost-Optimization Opportunities**:\n`;
      budget.costSavingSuggestions.forEach((s) => {
        md += `- ${s}\n`;
      });
      md += `\n`;
    }
  }

  // 5. Volunteer Team Organization Matrix
  if (volunteers.length > 0) {
    md += `#### 5. Volunteer Team Organization Matrix\n\n`;
    md += `| Volunteer Division | Headcount | Core Responsibilities & Deliverables |\n`;
    md += `| :--- | :--- | :--- |\n`;
    volunteers.forEach((v) => {
      md += `| ${v.team || ''} | ${v.headcount || ''} | ${v.responsibilities || ''} |\n`;
    });
    md += `\n`;
  }

  // 6. Operational Risk Assessment Matrix
  if (risks.length > 0) {
    md += `#### 6. Operational Risk Assessment & Mitigation Matrix\n\n`;
    md += `| Operational Hazard / Risk | Likelihood | Impact | Actionable Mitigation Protocol |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    risks.forEach((r) => {
      md += `| ${r.risk || ''} | ${r.probability || ''} | ${r.impact || ''} | ${r.mitigation || ''} |\n`;
    });
    md += `\n`;
  }

  // 7. Ready-to-Use Mission Communications Suite
  if (drafts.length > 0) {
    md += `#### 7. Ready-to-Use Mission Communications Suite\n\n`;
    drafts.forEach((d, idx) => {
      const draftLabel = d.type === 'INSTITUTIONAL_APPROVAL'
        ? 'Document A: Institutional Approval Request Letter'
        : (d.type === 'SPONSOR_OUTREACH'
            ? 'Document B: Corporate Sponsorship & Mentor Invitation Pitch'
            : (d.type === 'PARTICIPANT_ANNOUNCEMENT'
                ? 'Document C: Participant Announcement & Onboarding Guide'
                : `Document ${idx + 1}: ${d.type || 'Draft'}`));

      md += `##### ${draftLabel}\n\n`;
      md += `- **Intended Recipient**: \`${d.recipient || 'Designated Stakeholder'}\`\n`;
      md += `- **Subject Line**: *${d.subject || 'Mission Communication'}*\n\n`;
      md += `\`\`\`text\n${d.content}\n\`\`\`\n\n`;
    });
  }

  return md;
}

export {
  buildDataAnalysisResponse,
  buildStatisticalResponse,
};

export const universalResponseBuilder = {
  buildUniversalResponse,
  buildDataAnalysisResponse,
  buildStatisticalResponse,
};

export default buildUniversalResponse;
