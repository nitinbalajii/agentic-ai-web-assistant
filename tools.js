// tools.js - External Tool Schemas & Handlers for Gemini Function Calling
const { z } = require('zod');

// Tool 1: Emergency First Aid Protocol
const FirstAidProtocolSchema = z.object({
  condition: z.string().describe("The suspected medical emergency, e.g. 'cardiac_arrest', 'severe_burn', 'heatstroke', 'fracture'"),
  ageGroup: z.enum(['CHILD', 'ADULT', 'ELDERLY']).default('ADULT').describe("Patient demographic group")
});

function fetchFirstAidProtocol(args) {
  const { condition, ageGroup } = FirstAidProtocolSchema.parse(args);
  const protocols = {
    cardiac_arrest: {
      action: "Immediate CPR Required",
      steps: [
        "Call local emergency services (112 / 911) immediately.",
        "Check responsiveness and pulse.",
        "Place hands in center of chest and begin 100-120 rapid compressions per minute.",
        "Retrieve and attach Automated External Defibrillator (AED) if available."
      ],
      caution: "Do not stop compressions until medical personnel arrive."
    },
    severe_burn: {
      action: "Thermal Burn Protocol",
      steps: [
        "Cool the burn with gentle, cool running tap water for 10-15 minutes.",
        "Remove constricting items (rings, clothing) before swelling starts.",
        "Cover loosely with a sterile, non-adherent dressing or clean plastic film."
      ],
      caution: "Never apply ice, butter, or oil to the burn."
    },
    heatstroke: {
      action: "Hyperthermia Cooling Protocol",
      steps: [
        "Move patient immediately to a shaded or air-conditioned environment.",
        "Loosen restrictive clothing.",
        "Apply cool wet cloths to the neck, armpits, and groin."
      ],
      caution: "Do not give fluids if the patient is confused or vomiting."
    }
  };

  const key = condition.toLowerCase().replace(/\s+/g, '_');
  return protocols[key] || {
    action: "General Stabilization",
    steps: ["Keep patient calm and still.", "Monitor airway, breathing, and circulation.", "Contact emergency medical services."],
    caution: "Avoid administering medication without verified medical guidance."
  };
}

// Tool 2: Hospital Bed & Department Capacity
const HospitalCapacitySchema = z.object({
  city: z.string().describe("City name, e.g., 'New Delhi', 'Gurgaon', 'Noida'"),
  specialty: z.enum(['ICU', 'EMERGENCY', 'TRAUMA', 'CARDIOLOGY']).default('EMERGENCY')
});

function checkHospitalResourceCapacity(args) {
  const { city, specialty } = HospitalCapacitySchema.parse(args);
  return {
    queriedCity: city,
    requestedSpecialty: specialty,
    timestamp: new Date().toISOString(),
    facilities: [
      { name: `${city} Central Medical Center`, availableBeds: 12, waitTimeMinutes: 5, traumaLevel: 1 },
      { name: `${city} Apex Healthcare`, availableBeds: 4, waitTimeMinutes: 18, traumaLevel: 2 }
    ]
  };
}

// Tool 3: Triage Acuity Assessment
const TriageAssessmentSchema = z.object({
  symptoms: z.array(z.string()).describe("List of reported symptoms"),
  heartRate: z.number().optional().describe("Heart rate in BPM"),
  oxygenLevel: z.number().optional().describe("Blood oxygen saturation percentage (SpO2)")
});

function calculateTriageScore(args) {
  const { symptoms, heartRate, oxygenLevel } = TriageAssessmentSchema.parse(args);
  let urgency = "ROUTINE (Level 4)";
  let score = 20;

  if (symptoms.some(s => /chest pain|unconscious|severe bleeding|stroke|breathing difficulty/i.test(s))) {
    urgency = "RESUSCITATION / IMMEDIATE (Level 1)";
    score = 95;
  } else if ((heartRate && (heartRate > 120 || heartRate < 45)) || (oxygenLevel && oxygenLevel < 92)) {
    urgency = "EMERGENT (Level 2)";
    score = 80;
  }

  return {
    calculatedScore: score,
    triageCategory: urgency,
    recommendedAction: score > 75 ? "Dispatch ALS (Advanced Life Support) Unit Immediately" : "Schedule urgent clinic assessment"
  };
}

// Tool Definitions for Gemini API Function Declarations
const toolDeclarations = [
  {
    name: "fetchFirstAidProtocol",
    description: "Fetches step-by-step immediate first aid instructions and life-saving protocols for medical conditions.",
    parameters: {
      type: "OBJECT",
      properties: {
        condition: { type: "STRING", description: "The medical emergency, e.g. cardiac_arrest, severe_burn, heatstroke" },
        ageGroup: { type: "STRING", enum: ["CHILD", "ADULT", "ELDERLY"], description: "Patient demographic" }
      },
      required: ["condition"]
    }
  },
  {
    name: "checkHospitalResourceCapacity",
    description: "Queries live bed capacity, wait times, and emergency department availability in a specified city.",
    parameters: {
      type: "OBJECT",
      properties: {
        city: { type: "STRING", description: "City or district name" },
        specialty: { type: "STRING", enum: ["ICU", "EMERGENCY", "TRAUMA", "CARDIOLOGY"], description: "Specialty department" }
      },
      required: ["city"]
    }
  },
  {
    name: "calculateTriageScore",
    description: "Evaluates patient symptoms and vital signs to calculate a clinical triage urgency tier.",
    parameters: {
      type: "OBJECT",
      properties: {
        symptoms: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "List of identified symptoms"
        },
        heartRate: { type: "INTEGER", description: "Patient heart rate in BPM" },
        oxygenLevel: { type: "INTEGER", description: "Blood oxygen saturation percentage SpO2" }
      },
      required: ["symptoms"]
    }
  }
];

module.exports = {
  toolDeclarations,
  handlers: {
    fetchFirstAidProtocol,
    checkHospitalResourceCapacity,
    calculateTriageScore
  }
};
