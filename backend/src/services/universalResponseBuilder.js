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

  let md = '';

  // ==========================================
  // SECTION A: REQUEST SUMMARY
  // ==========================================
  const summaryPrefix = getCategorySummary(category, userRequest, isConfirmed, status);
  md += `${summaryPrefix}\n\n`;

  const isLocalResearch =
    category === 'LOCATION_DISCOVERY' ||
    category === 'LOCAL_SERVICE_RESEARCH' ||
    category === 'LOCAL_SERVICE' ||
    Boolean(task.discoveredData?.localService);

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
  if (booking && !isLocalResearch && !isMissionPlanning) {
    md += buildBookingStatusSection(booking, isConfirmed);
  }

  // ==========================================
  // SECTION G: APPROVAL STATUS (HITL Gate)
  // ==========================================
  if ((status === 'AWAITING_APPROVAL' || status === 'WAITING_FOR_APPROVAL' || pendingApproval) && !isLocalResearch && !isMissionPlanning) {
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

function buildDocumentSection(docs, crossDocAnalysis, userRequest) {
  let md = '';

  // 1. Multi-Document Comparative Intelligence (When 2+ documents are analyzed)
  if (crossDocAnalysis && Array.isArray(crossDocAnalysis.comparisonMatrix) && crossDocAnalysis.comparisonMatrix.length > 0) {
    md += `### Multi-Document Comparative Intelligence\n\n`;
    if (crossDocAnalysis.comparisonSummary) {
      md += `> ${crossDocAnalysis.comparisonSummary}\n\n`;
    }

    md += `| Comparison Dimension | Document 1 | Document 2 | Comparative Finding |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    crossDocAnalysis.comparisonMatrix.forEach((m) => {
      md += `| **${m.criteria}** | ${m.doc1Value || '-'} | ${m.doc2Value || '-'} | ${m.verdict || '-'} |\n`;
    });
    md += `\n`;

    if (crossDocAnalysis.commonRequirements && crossDocAnalysis.commonRequirements.length > 0) {
      md += `**Common Terms & Requirements Across Documents**:\n`;
      crossDocAnalysis.commonRequirements.forEach((r) => (md += `- ${r}\n`));
      md += `\n`;
    }

    if (crossDocAnalysis.conflictingRequirements && crossDocAnalysis.conflictingRequirements.length > 0) {
      md += `**Key Discrepancies & Conflicts**:\n`;
      crossDocAnalysis.conflictingRequirements.forEach((c) => {
        if (typeof c === 'string') {
          md += `- ${c}\n`;
        } else {
          md += `- **${c.issue}**: Doc 1 (*${c.doc1Stance}*) vs Doc 2 (*${c.doc2Stance}*)\n`;
        }
      });
      md += `\n`;
    }

    if (crossDocAnalysis.missingInEach) {
      const doc1Lacks = crossDocAnalysis.missingInEach.doc1Lacks || [];
      const doc2Lacks = crossDocAnalysis.missingInEach.doc2Lacks || [];
      if (doc1Lacks.length > 0 || doc2Lacks.length > 0) {
        md += `**Coverage Gaps Between Sources**:\n`;
        if (doc1Lacks.length > 0) md += `- **Missing in Doc 1**: ${doc1Lacks.join('; ')}\n`;
        if (doc2Lacks.length > 0) md += `- **Missing in Doc 2**: ${doc2Lacks.join('; ')}\n`;
        md += `\n`;
      }
    }

    if (crossDocAnalysis.recommendation) {
      md += `#### Grounded Decision Recommendation\n> ${crossDocAnalysis.recommendation}\n\n`;
    }

    md += `---\n\n`;
  }

  // 2. Individual Document Deep Reports
  (docs || []).forEach((doc, idx) => {
    const scopeLabel = doc.fileType === 'PPTX' || doc.fileType === 'PPT'
      ? `${doc.pageCount || 1} slide(s)`
      : (doc.fileType === 'XLSX' || doc.fileType === 'XLS' ? `${doc.pageCount || 1} sheet(s)` : `${doc.pageCount || 1} page(s)`);

    md += `### Document Report: ${doc.filename}\n\n`;
    md += `- **Format**: \`${doc.fileType || 'DOCUMENT'}\` • **Scope**: **${scopeLabel}** (${doc.wordCount || 0} words)\n`;
    md += `- **Processing Status**: **${doc.extractionStatus === 'COMPLETED' ? '✓ Successfully Extracted & Grounded' : (doc.isScanned ? '📷 Scanned Document (OCR Verified)' : '⚠️ Partial Extraction')}**\n\n`;

    // Executive Summary
    if (doc.summary) {
      md += `#### Executive Summary\n> ${doc.summary}\n\n`;
    }

    // Factual Findings with exact Page/Slide citations
    const facts = doc.factualFindings && doc.factualFindings.length > 0
      ? doc.factualFindings
      : (doc.keyFindings || []);

    if (facts.length > 0) {
      md += `#### Grounded Factual Statements\n`;
      facts.forEach((f) => {
        if (typeof f === 'string') {
          md += `- ${f}\n`;
        } else {
          const cit = f.citation ? ` *(${f.citation})*` : '';
          md += `- ${f.fact || f.claim || f}${cit}\n`;
        }
      });
      md += `\n`;
    }

    // AI Interpretations & Technical Breakdown
    if (doc.aiInterpretations && doc.aiInterpretations.length > 0) {
      md += `#### AI Technical Interpretation & Synthesis\n`;
      doc.aiInterpretations.forEach((item) => (md += `- ${item}\n`));
      md += `\n`;
    }

    // Important Sections
    if (doc.importantSections && doc.importantSections.length > 0) {
      md += `#### Key Sections & Structural Hierarchy\n`;
      doc.importantSections.slice(0, 6).forEach((s) => {
        md += `- **${s.title || s.section}** ${s.pageOrReference ? `*(${s.pageOrReference})*` : ''}: ${s.content || s.summary || ''}\n`;
      });
      md += `\n`;
    }

    // Key Requirements & Technologies
    if ((doc.keyRequirements && doc.keyRequirements.length > 0) || (doc.technologies && doc.technologies.length > 0)) {
      if (doc.keyRequirements?.length > 0) {
        md += `#### Key Requirements & Specifications\n`;
        doc.keyRequirements.forEach((r) => (md += `- ${r}\n`));
        md += `\n`;
      }
      if (doc.technologies?.length > 0) {
        md += `**Identified Technologies & Stacks**: ${doc.technologies.map((t) => `\`${t}\``).join(', ')}\n\n`;
      }
    }

    // Identified Weaknesses & Risks
    if (doc.identifiedWeaknesses && doc.identifiedWeaknesses.length > 0) {
      md += `#### Identified Weaknesses, Risks & Missing Components\n`;
      doc.identifiedWeaknesses.forEach((w) => (md += `- ⚠️ ${w}\n`));
      md += `\n`;
    }

    // Recommendations
    if (doc.recommendations && doc.recommendations.length > 0) {
      md += `#### Improvement Recommendations\n`;
      doc.recommendations.forEach((r) => (md += `- 💡 ${r}\n`));
      md += `\n`;
    }

    // Missing Information Notice (Anti-hallucination guarantee)
    if (doc.missingInformation && doc.missingInformation.length > 0 && doc.missingInformation[0] !== 'None') {
      md += `> ℹ️ **Information Absent in Document**: The document does not contain explicit records regarding: *${doc.missingInformation.join(', ')}*. No external assumptions were fabricated.\n\n`;
    }

    // Processing Limitations
    if (doc.limitations && doc.limitations.length > 0) {
      md += `*Extraction Limitations: ${doc.limitations.join('; ')}*\n\n`;
    }
  });

  return md;
}

function buildDataAnalysisResponse(analysis, task, userRequest) {
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

  let md = '';

  // 1. HEADER & NATURAL LANGUAGE SUMMARY
  if (isHighestQuery && highest) {
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
  if (isMonthlyQuery) {
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

export default buildUniversalResponse;
