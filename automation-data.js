window.DEMO_WORKFLOWS = [
  {
    "id": "WF-1001",
    "name": "30-day recall recovery",
    "description": "Contact customers when an eye-test recall is approaching and create a reception task when they do not book.",
    "category": "Recalls",
    "active": true,
    "trigger": {
      "type": "recall_due",
      "label": "Recall due within 30 days"
    },
    "conditions": [
      {
        "field": "Communication consent",
        "operator": "is",
        "value": "Yes"
      },
      {
        "field": "Customer status",
        "operator": "is",
        "value": "Active"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send personalised recall email",
        "details": "Outlook \u00b7 Recall template"
      },
      {
        "id": "S2",
        "type": "delay",
        "label": "Wait 7 days",
        "details": "Continue only if no appointment is booked"
      },
      {
        "id": "S3",
        "type": "branch",
        "label": "Has the customer booked?",
        "details": "Yes \u2192 finish \u00b7 No \u2192 continue"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Send WhatsApp reminder",
        "details": "WhatsApp Business \u00b7 Consent checked"
      },
      {
        "id": "S5",
        "type": "action",
        "label": "Create reception call task",
        "details": "Due in 2 working days"
      }
    ]
  },
  {
    "id": "WF-1002",
    "name": "Tomorrow appointment confirmation",
    "description": "Confirm tomorrow\u2019s appointments and alert reception when a customer asks to rearrange.",
    "category": "Appointments",
    "active": true,
    "trigger": {
      "type": "appointment_upcoming",
      "label": "Appointment starts in 24 hours"
    },
    "conditions": [
      {
        "field": "Appointment status",
        "operator": "is not",
        "value": "Cancelled"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send appointment confirmation",
        "details": "SMS \u00b7 Includes date, time and practitioner"
      },
      {
        "id": "S2",
        "type": "delay",
        "label": "Wait 4 hours",
        "details": "Pause for customer response"
      },
      {
        "id": "S3",
        "type": "branch",
        "label": "Customer response",
        "details": "Confirmed \u2192 update booking \u00b7 Change requested \u2192 task"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Notify reception of changes",
        "details": "Microsoft Teams \u00b7 Front desk channel"
      }
    ]
  },
  {
    "id": "WF-1003",
    "name": "Missed appointment recovery",
    "description": "Recover no-shows through a friendly message and a timed follow-up task.",
    "category": "Appointments",
    "active": true,
    "trigger": {
      "type": "appointment_no_show",
      "label": "Appointment marked No-show"
    },
    "conditions": [
      {
        "field": "Customer status",
        "operator": "is",
        "value": "Active"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send rebooking WhatsApp",
        "details": "Includes next available appointment link"
      },
      {
        "id": "S2",
        "type": "delay",
        "label": "Wait 2 days",
        "details": "Stop when a new booking is found"
      },
      {
        "id": "S3",
        "type": "branch",
        "label": "Rebooked?",
        "details": "Yes \u2192 record recovery \u00b7 No \u2192 call task"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Create priority call task",
        "details": "Reception \u00b7 Medium priority"
      }
    ]
  },
  {
    "id": "WF-1004",
    "name": "New prescription retail follow-up",
    "description": "Create an ethical retail opportunity after a prescription update, with staff approval before customer contact.",
    "category": "Retail",
    "active": true,
    "trigger": {
      "type": "prescription_issued",
      "label": "New prescription recorded"
    },
    "conditions": [
      {
        "field": "Prescription change",
        "operator": "is greater than",
        "value": "0.25D"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Create frame and lens opportunity",
        "details": "Uses age, prescription and purchase history"
      },
      {
        "id": "S2",
        "type": "approval",
        "label": "Optometrist reviews recommendation",
        "details": "No customer message until approved"
      },
      {
        "id": "S3",
        "type": "action",
        "label": "Send approved product email",
        "details": "Personalised options without clinical claims"
      },
      {
        "id": "S4",
        "type": "delay",
        "label": "Wait 7 days",
        "details": "Check whether a sale was recorded"
      },
      {
        "id": "S5",
        "type": "action",
        "label": "Create retail follow-up task",
        "details": "Dispensing team"
      }
    ]
  },
  {
    "id": "WF-1005",
    "name": "Contact lens reorder reminder",
    "description": "Identify contact lens customers likely to need a reorder and prompt the dispensing team.",
    "category": "Retail",
    "active": true,
    "trigger": {
      "type": "contact_lens_due",
      "label": "Contact lens supply reaches estimated reorder date"
    },
    "conditions": [
      {
        "field": "Last product category",
        "operator": "contains",
        "value": "Contact lenses"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send reorder reminder email",
        "details": "Shows usual product and quantity"
      },
      {
        "id": "S2",
        "type": "branch",
        "label": "Online order received?",
        "details": "Yes \u2192 reserve stock \u00b7 No \u2192 wait"
      },
      {
        "id": "S3",
        "type": "delay",
        "label": "Wait 3 days",
        "details": "Follow up once"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Create dispensing call task",
        "details": "Only when no order exists"
      }
    ]
  },
  {
    "id": "WF-1006",
    "name": "Low-stock purchase request",
    "description": "Create a purchase request and notify the manager when products reach their reorder level.",
    "category": "Stock",
    "active": true,
    "trigger": {
      "type": "stock_low",
      "label": "Product stock at or below reorder level"
    },
    "conditions": [
      {
        "field": "Product status",
        "operator": "is",
        "value": "Active"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Create stock purchase request",
        "details": "Suggested quantity restores four weeks of stock"
      },
      {
        "id": "S2",
        "type": "approval",
        "label": "Manager approves supplier order",
        "details": "Approval required over \u00a3250"
      },
      {
        "id": "S3",
        "type": "action",
        "label": "Notify dispensing team",
        "details": "Teams \u00b7 Stock alerts channel"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Send supplier webhook",
        "details": "Demo outgoing REST request"
      }
    ]
  },
  {
    "id": "WF-1007",
    "name": "Customer email triage",
    "description": "Classify incoming customer emails and route urgent or booking-related messages to the right staff queue.",
    "category": "Communications",
    "active": true,
    "trigger": {
      "type": "email_received",
      "label": "New customer email received"
    },
    "conditions": [],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Classify message intent",
        "details": "Booking \u00b7 Order \u00b7 Clinical \u00b7 General"
      },
      {
        "id": "S2",
        "type": "branch",
        "label": "Is the message urgent?",
        "details": "Urgent \u2192 optometrist task \u00b7 Other \u2192 reception queue"
      },
      {
        "id": "S3",
        "type": "action",
        "label": "Create linked staff task",
        "details": "Customer and email attached"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Draft acknowledgement",
        "details": "Human review before sending"
      }
    ]
  },
  {
    "id": "WF-1008",
    "name": "New customer welcome journey",
    "description": "Welcome new customers, request forms and create a preparation task before their first visit.",
    "category": "Onboarding",
    "active": false,
    "trigger": {
      "type": "customer_created",
      "label": "New customer created"
    },
    "conditions": [
      {
        "field": "Communication consent",
        "operator": "is",
        "value": "Yes"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send welcome email",
        "details": "Practice information and directions"
      },
      {
        "id": "S2",
        "type": "action",
        "label": "Request medical history form",
        "details": "Secure customer form link"
      },
      {
        "id": "S3",
        "type": "delay",
        "label": "Wait 3 days",
        "details": "Check form completion"
      },
      {
        "id": "S4",
        "type": "branch",
        "label": "Form completed?",
        "details": "No \u2192 create reception task \u00b7 Yes \u2192 finish"
      }
    ]
  }
];
window.DEMO_AUTOMATION_TEMPLATES = [
  {
    "id": "TPL-001",
    "name": "30-day recall recovery",
    "description": "Contact customers when an eye-test recall is approaching and create a reception task when they do not book.",
    "category": "Recalls",
    "active": false,
    "trigger": {
      "type": "recall_due",
      "label": "Recall due within 30 days"
    },
    "conditions": [
      {
        "field": "Communication consent",
        "operator": "is",
        "value": "Yes"
      },
      {
        "field": "Customer status",
        "operator": "is",
        "value": "Active"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send personalised recall email",
        "details": "Outlook \u00b7 Recall template"
      },
      {
        "id": "S2",
        "type": "delay",
        "label": "Wait 7 days",
        "details": "Continue only if no appointment is booked"
      },
      {
        "id": "S3",
        "type": "branch",
        "label": "Has the customer booked?",
        "details": "Yes \u2192 finish \u00b7 No \u2192 continue"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Send WhatsApp reminder",
        "details": "WhatsApp Business \u00b7 Consent checked"
      },
      {
        "id": "S5",
        "type": "action",
        "label": "Create reception call task",
        "details": "Due in 2 working days"
      }
    ]
  },
  {
    "id": "TPL-002",
    "name": "Tomorrow appointment confirmation",
    "description": "Confirm tomorrow\u2019s appointments and alert reception when a customer asks to rearrange.",
    "category": "Appointments",
    "active": false,
    "trigger": {
      "type": "appointment_upcoming",
      "label": "Appointment starts in 24 hours"
    },
    "conditions": [
      {
        "field": "Appointment status",
        "operator": "is not",
        "value": "Cancelled"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send appointment confirmation",
        "details": "SMS \u00b7 Includes date, time and practitioner"
      },
      {
        "id": "S2",
        "type": "delay",
        "label": "Wait 4 hours",
        "details": "Pause for customer response"
      },
      {
        "id": "S3",
        "type": "branch",
        "label": "Customer response",
        "details": "Confirmed \u2192 update booking \u00b7 Change requested \u2192 task"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Notify reception of changes",
        "details": "Microsoft Teams \u00b7 Front desk channel"
      }
    ]
  },
  {
    "id": "TPL-003",
    "name": "Missed appointment recovery",
    "description": "Recover no-shows through a friendly message and a timed follow-up task.",
    "category": "Appointments",
    "active": false,
    "trigger": {
      "type": "appointment_no_show",
      "label": "Appointment marked No-show"
    },
    "conditions": [
      {
        "field": "Customer status",
        "operator": "is",
        "value": "Active"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send rebooking WhatsApp",
        "details": "Includes next available appointment link"
      },
      {
        "id": "S2",
        "type": "delay",
        "label": "Wait 2 days",
        "details": "Stop when a new booking is found"
      },
      {
        "id": "S3",
        "type": "branch",
        "label": "Rebooked?",
        "details": "Yes \u2192 record recovery \u00b7 No \u2192 call task"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Create priority call task",
        "details": "Reception \u00b7 Medium priority"
      }
    ]
  },
  {
    "id": "TPL-004",
    "name": "New prescription retail follow-up",
    "description": "Create an ethical retail opportunity after a prescription update, with staff approval before customer contact.",
    "category": "Retail",
    "active": false,
    "trigger": {
      "type": "prescription_issued",
      "label": "New prescription recorded"
    },
    "conditions": [
      {
        "field": "Prescription change",
        "operator": "is greater than",
        "value": "0.25D"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Create frame and lens opportunity",
        "details": "Uses age, prescription and purchase history"
      },
      {
        "id": "S2",
        "type": "approval",
        "label": "Optometrist reviews recommendation",
        "details": "No customer message until approved"
      },
      {
        "id": "S3",
        "type": "action",
        "label": "Send approved product email",
        "details": "Personalised options without clinical claims"
      },
      {
        "id": "S4",
        "type": "delay",
        "label": "Wait 7 days",
        "details": "Check whether a sale was recorded"
      },
      {
        "id": "S5",
        "type": "action",
        "label": "Create retail follow-up task",
        "details": "Dispensing team"
      }
    ]
  },
  {
    "id": "TPL-005",
    "name": "Contact lens reorder reminder",
    "description": "Identify contact lens customers likely to need a reorder and prompt the dispensing team.",
    "category": "Retail",
    "active": false,
    "trigger": {
      "type": "contact_lens_due",
      "label": "Contact lens supply reaches estimated reorder date"
    },
    "conditions": [
      {
        "field": "Last product category",
        "operator": "contains",
        "value": "Contact lenses"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send reorder reminder email",
        "details": "Shows usual product and quantity"
      },
      {
        "id": "S2",
        "type": "branch",
        "label": "Online order received?",
        "details": "Yes \u2192 reserve stock \u00b7 No \u2192 wait"
      },
      {
        "id": "S3",
        "type": "delay",
        "label": "Wait 3 days",
        "details": "Follow up once"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Create dispensing call task",
        "details": "Only when no order exists"
      }
    ]
  },
  {
    "id": "TPL-006",
    "name": "Low-stock purchase request",
    "description": "Create a purchase request and notify the manager when products reach their reorder level.",
    "category": "Stock",
    "active": false,
    "trigger": {
      "type": "stock_low",
      "label": "Product stock at or below reorder level"
    },
    "conditions": [
      {
        "field": "Product status",
        "operator": "is",
        "value": "Active"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Create stock purchase request",
        "details": "Suggested quantity restores four weeks of stock"
      },
      {
        "id": "S2",
        "type": "approval",
        "label": "Manager approves supplier order",
        "details": "Approval required over \u00a3250"
      },
      {
        "id": "S3",
        "type": "action",
        "label": "Notify dispensing team",
        "details": "Teams \u00b7 Stock alerts channel"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Send supplier webhook",
        "details": "Demo outgoing REST request"
      }
    ]
  },
  {
    "id": "TPL-007",
    "name": "Customer email triage",
    "description": "Classify incoming customer emails and route urgent or booking-related messages to the right staff queue.",
    "category": "Communications",
    "active": false,
    "trigger": {
      "type": "email_received",
      "label": "New customer email received"
    },
    "conditions": [],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Classify message intent",
        "details": "Booking \u00b7 Order \u00b7 Clinical \u00b7 General"
      },
      {
        "id": "S2",
        "type": "branch",
        "label": "Is the message urgent?",
        "details": "Urgent \u2192 optometrist task \u00b7 Other \u2192 reception queue"
      },
      {
        "id": "S3",
        "type": "action",
        "label": "Create linked staff task",
        "details": "Customer and email attached"
      },
      {
        "id": "S4",
        "type": "action",
        "label": "Draft acknowledgement",
        "details": "Human review before sending"
      }
    ]
  },
  {
    "id": "TPL-008",
    "name": "New customer welcome journey",
    "description": "Welcome new customers, request forms and create a preparation task before their first visit.",
    "category": "Onboarding",
    "active": false,
    "trigger": {
      "type": "customer_created",
      "label": "New customer created"
    },
    "conditions": [
      {
        "field": "Communication consent",
        "operator": "is",
        "value": "Yes"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "action",
        "label": "Send welcome email",
        "details": "Practice information and directions"
      },
      {
        "id": "S2",
        "type": "action",
        "label": "Request medical history form",
        "details": "Secure customer form link"
      },
      {
        "id": "S3",
        "type": "delay",
        "label": "Wait 3 days",
        "details": "Check form completion"
      },
      {
        "id": "S4",
        "type": "branch",
        "label": "Form completed?",
        "details": "No \u2192 create reception task \u00b7 Yes \u2192 finish"
      }
    ]
  },
  {
    "id": "TPL-009",
    "name": "Birthday eyewear offer",
    "description": "Create a consent-aware birthday promotion for suitable retail customers.",
    "category": "Marketing",
    "active": false,
    "trigger": {
      "type": "birthday_upcoming",
      "label": "Customer birthday in 14 days"
    },
    "conditions": [
      {
        "field": "Marketing consent",
        "operator": "is",
        "value": "Yes"
      }
    ],
    "steps": [
      {
        "id": "S1",
        "type": "approval",
        "label": "Manager approves campaign",
        "details": "Review offer and audience"
      },
      {
        "id": "S2",
        "type": "action",
        "label": "Send birthday email",
        "details": "Single-use retail offer"
      },
      {
        "id": "S3",
        "type": "delay",
        "label": "Wait 14 days",
        "details": "Measure attributed sales"
      }
    ]
  },
  {
    "id": "TPL-010",
    "name": "Glasses collection follow-up",
    "description": "Ask customers whether their new glasses are comfortable after collection.",
    "category": "Aftercare",
    "active": false,
    "trigger": {
      "type": "product_collected",
      "label": "Glasses order marked Collected"
    },
    "conditions": [],
    "steps": [
      {
        "id": "S1",
        "type": "delay",
        "label": "Wait 7 days",
        "details": "Allow adaptation time"
      },
      {
        "id": "S2",
        "type": "action",
        "label": "Send aftercare check-in",
        "details": "Email or preferred contact channel"
      },
      {
        "id": "S3",
        "type": "branch",
        "label": "Customer reports a problem?",
        "details": "Yes \u2192 adjustment appointment task"
      }
    ]
  }
];
window.DEMO_AUTOMATION_RUNS = [
  {
    "id": "RUN-5001",
    "workflowId": "WF-1001",
    "customerId": "CUST-1027",
    "startedAt": "2026-07-22T15:30",
    "status": "Succeeded",
    "durationSeconds": 46,
    "revenue": 0,
    "timeSavedMinutes": 10,
    "appointmentRecovered": true,
    "triggerSummary": "Recall due within 30 days",
    "steps": [
      {
        "name": "Send personalised recall email",
        "status": "Succeeded",
        "detail": "Outlook \u00b7 Recall template"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Continue only if no appointment is booked"
      },
      {
        "name": "Has the customer booked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 finish \u00b7 No \u2192 continue"
      },
      {
        "name": "Send WhatsApp reminder",
        "status": "Succeeded",
        "detail": "WhatsApp Business \u00b7 Consent checked"
      },
      {
        "name": "Create reception call task",
        "status": "Succeeded",
        "detail": "Due in 2 working days"
      }
    ]
  },
  {
    "id": "RUN-5002",
    "workflowId": "WF-1002",
    "customerId": "CUST-1031",
    "startedAt": "2026-07-22T09:30",
    "status": "Succeeded",
    "durationSeconds": 15,
    "revenue": 0,
    "timeSavedMinutes": 16,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment starts in 24 hours",
    "steps": [
      {
        "name": "Send appointment confirmation",
        "status": "Succeeded",
        "detail": "SMS \u00b7 Includes date, time and practitioner"
      },
      {
        "name": "Wait 4 hours",
        "status": "Succeeded",
        "detail": "Pause for customer response"
      },
      {
        "name": "Customer response",
        "status": "Succeeded",
        "detail": "Confirmed \u2192 update booking \u00b7 Change requested \u2192 task"
      },
      {
        "name": "Notify reception of changes",
        "status": "Succeeded",
        "detail": "Microsoft Teams \u00b7 Front desk channel"
      }
    ]
  },
  {
    "id": "RUN-5003",
    "workflowId": "WF-1003",
    "customerId": "CUST-1033",
    "startedAt": "2026-07-22T03:30",
    "status": "Succeeded",
    "durationSeconds": 13,
    "revenue": 0,
    "timeSavedMinutes": 12,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment marked No-show",
    "steps": [
      {
        "name": "Send rebooking WhatsApp",
        "status": "Succeeded",
        "detail": "Includes next available appointment link"
      },
      {
        "name": "Wait 2 days",
        "status": "Succeeded",
        "detail": "Stop when a new booking is found"
      },
      {
        "name": "Rebooked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 record recovery \u00b7 No \u2192 call task"
      },
      {
        "name": "Create priority call task",
        "status": "Succeeded",
        "detail": "Reception \u00b7 Medium priority"
      }
    ]
  },
  {
    "id": "RUN-5004",
    "workflowId": "WF-1004",
    "customerId": "CUST-1001",
    "startedAt": "2026-07-22T00:30",
    "status": "Succeeded",
    "durationSeconds": 25,
    "revenue": 65,
    "timeSavedMinutes": 18,
    "appointmentRecovered": false,
    "triggerSummary": "New prescription recorded",
    "steps": [
      {
        "name": "Create frame and lens opportunity",
        "status": "Succeeded",
        "detail": "Uses age, prescription and purchase history"
      },
      {
        "name": "Optometrist reviews recommendation",
        "status": "Succeeded",
        "detail": "No customer message until approved"
      },
      {
        "name": "Send approved product email",
        "status": "Succeeded",
        "detail": "Personalised options without clinical claims"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Check whether a sale was recorded"
      },
      {
        "name": "Create retail follow-up task",
        "status": "Succeeded",
        "detail": "Dispensing team"
      }
    ]
  },
  {
    "id": "RUN-5005",
    "workflowId": "WF-1005",
    "customerId": "CUST-1005",
    "startedAt": "2026-07-21T17:30",
    "status": "Succeeded",
    "durationSeconds": 16,
    "revenue": 95,
    "timeSavedMinutes": 18,
    "appointmentRecovered": false,
    "triggerSummary": "Contact lens supply reaches estimated reorder date",
    "steps": [
      {
        "name": "Send reorder reminder email",
        "status": "Succeeded",
        "detail": "Shows usual product and quantity"
      },
      {
        "name": "Online order received?",
        "status": "Succeeded",
        "detail": "Yes \u2192 reserve stock \u00b7 No \u2192 wait"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Follow up once"
      },
      {
        "name": "Create dispensing call task",
        "status": "Succeeded",
        "detail": "Only when no order exists"
      }
    ]
  },
  {
    "id": "RUN-5006",
    "workflowId": "WF-1006",
    "customerId": "CUST-1045",
    "startedAt": "2026-07-21T14:30",
    "status": "Succeeded",
    "durationSeconds": 4,
    "revenue": 0,
    "timeSavedMinutes": 10,
    "appointmentRecovered": false,
    "triggerSummary": "Product stock at or below reorder level",
    "steps": [
      {
        "name": "Create stock purchase request",
        "status": "Succeeded",
        "detail": "Suggested quantity restores four weeks of stock"
      },
      {
        "name": "Manager approves supplier order",
        "status": "Succeeded",
        "detail": "Approval required over \u00a3250"
      },
      {
        "name": "Notify dispensing team",
        "status": "Succeeded",
        "detail": "Teams \u00b7 Stock alerts channel"
      },
      {
        "name": "Send supplier webhook",
        "status": "Succeeded",
        "detail": "Demo outgoing REST request"
      }
    ]
  },
  {
    "id": "RUN-5007",
    "workflowId": "WF-1007",
    "customerId": "CUST-1040",
    "startedAt": "2026-07-21T07:30",
    "status": "Succeeded",
    "durationSeconds": 30,
    "revenue": 0,
    "timeSavedMinutes": 4,
    "appointmentRecovered": false,
    "triggerSummary": "New customer email received",
    "steps": [
      {
        "name": "Classify message intent",
        "status": "Succeeded",
        "detail": "Booking \u00b7 Order \u00b7 Clinical \u00b7 General"
      },
      {
        "name": "Is the message urgent?",
        "status": "Succeeded",
        "detail": "Urgent \u2192 optometrist task \u00b7 Other \u2192 reception queue"
      },
      {
        "name": "Create linked staff task",
        "status": "Succeeded",
        "detail": "Customer and email attached"
      },
      {
        "name": "Draft acknowledgement",
        "status": "Succeeded",
        "detail": "Human review before sending"
      }
    ]
  },
  {
    "id": "RUN-5008",
    "workflowId": "WF-1008",
    "customerId": "CUST-1035",
    "startedAt": "2026-07-21T03:30",
    "status": "Succeeded",
    "durationSeconds": 33,
    "revenue": 0,
    "timeSavedMinutes": 15,
    "appointmentRecovered": false,
    "triggerSummary": "New customer created",
    "steps": [
      {
        "name": "Send welcome email",
        "status": "Succeeded",
        "detail": "Practice information and directions"
      },
      {
        "name": "Request medical history form",
        "status": "Succeeded",
        "detail": "Secure customer form link"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Check form completion"
      },
      {
        "name": "Form completed?",
        "status": "Succeeded",
        "detail": "No \u2192 create reception task \u00b7 Yes \u2192 finish"
      }
    ]
  },
  {
    "id": "RUN-5009",
    "workflowId": "WF-1001",
    "customerId": "CUST-1042",
    "startedAt": "2026-07-21T00:30",
    "status": "Succeeded",
    "durationSeconds": 25,
    "revenue": 0,
    "timeSavedMinutes": 4,
    "appointmentRecovered": false,
    "triggerSummary": "Recall due within 30 days",
    "steps": [
      {
        "name": "Send personalised recall email",
        "status": "Succeeded",
        "detail": "Outlook \u00b7 Recall template"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Continue only if no appointment is booked"
      },
      {
        "name": "Has the customer booked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 finish \u00b7 No \u2192 continue"
      },
      {
        "name": "Send WhatsApp reminder",
        "status": "Succeeded",
        "detail": "WhatsApp Business \u00b7 Consent checked"
      },
      {
        "name": "Create reception call task",
        "status": "Succeeded",
        "detail": "Due in 2 working days"
      }
    ]
  },
  {
    "id": "RUN-5010",
    "workflowId": "WF-1002",
    "customerId": "CUST-1048",
    "startedAt": "2026-07-20T18:30",
    "status": "Succeeded",
    "durationSeconds": 7,
    "revenue": 0,
    "timeSavedMinutes": 5,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment starts in 24 hours",
    "steps": [
      {
        "name": "Send appointment confirmation",
        "status": "Succeeded",
        "detail": "SMS \u00b7 Includes date, time and practitioner"
      },
      {
        "name": "Wait 4 hours",
        "status": "Succeeded",
        "detail": "Pause for customer response"
      },
      {
        "name": "Customer response",
        "status": "Succeeded",
        "detail": "Confirmed \u2192 update booking \u00b7 Change requested \u2192 task"
      },
      {
        "name": "Notify reception of changes",
        "status": "Succeeded",
        "detail": "Microsoft Teams \u00b7 Front desk channel"
      }
    ]
  },
  {
    "id": "RUN-5011",
    "workflowId": "WF-1003",
    "customerId": "CUST-1030",
    "startedAt": "2026-07-20T14:30",
    "status": "Succeeded",
    "durationSeconds": 12,
    "revenue": 0,
    "timeSavedMinutes": 12,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment marked No-show",
    "steps": [
      {
        "name": "Send rebooking WhatsApp",
        "status": "Succeeded",
        "detail": "Includes next available appointment link"
      },
      {
        "name": "Wait 2 days",
        "status": "Succeeded",
        "detail": "Stop when a new booking is found"
      },
      {
        "name": "Rebooked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 record recovery \u00b7 No \u2192 call task"
      },
      {
        "name": "Create priority call task",
        "status": "Succeeded",
        "detail": "Reception \u00b7 Medium priority"
      }
    ]
  },
  {
    "id": "RUN-5012",
    "workflowId": "WF-1004",
    "customerId": "CUST-1026",
    "startedAt": "2026-07-20T07:30",
    "status": "Succeeded",
    "durationSeconds": 11,
    "revenue": 185,
    "timeSavedMinutes": 6,
    "appointmentRecovered": false,
    "triggerSummary": "New prescription recorded",
    "steps": [
      {
        "name": "Create frame and lens opportunity",
        "status": "Succeeded",
        "detail": "Uses age, prescription and purchase history"
      },
      {
        "name": "Optometrist reviews recommendation",
        "status": "Succeeded",
        "detail": "No customer message until approved"
      },
      {
        "name": "Send approved product email",
        "status": "Succeeded",
        "detail": "Personalised options without clinical claims"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Check whether a sale was recorded"
      },
      {
        "name": "Create retail follow-up task",
        "status": "Succeeded",
        "detail": "Dispensing team"
      }
    ]
  },
  {
    "id": "RUN-5013",
    "workflowId": "WF-1005",
    "customerId": "CUST-1031",
    "startedAt": "2026-07-20T04:30",
    "status": "Succeeded",
    "durationSeconds": 6,
    "revenue": 95,
    "timeSavedMinutes": 16,
    "appointmentRecovered": false,
    "triggerSummary": "Contact lens supply reaches estimated reorder date",
    "steps": [
      {
        "name": "Send reorder reminder email",
        "status": "Succeeded",
        "detail": "Shows usual product and quantity"
      },
      {
        "name": "Online order received?",
        "status": "Succeeded",
        "detail": "Yes \u2192 reserve stock \u00b7 No \u2192 wait"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Follow up once"
      },
      {
        "name": "Create dispensing call task",
        "status": "Succeeded",
        "detail": "Only when no order exists"
      }
    ]
  },
  {
    "id": "RUN-5014",
    "workflowId": "WF-1006",
    "customerId": "CUST-1014",
    "startedAt": "2026-07-19T22:30",
    "status": "Succeeded",
    "durationSeconds": 45,
    "revenue": 0,
    "timeSavedMinutes": 16,
    "appointmentRecovered": false,
    "triggerSummary": "Product stock at or below reorder level",
    "steps": [
      {
        "name": "Create stock purchase request",
        "status": "Succeeded",
        "detail": "Suggested quantity restores four weeks of stock"
      },
      {
        "name": "Manager approves supplier order",
        "status": "Succeeded",
        "detail": "Approval required over \u00a3250"
      },
      {
        "name": "Notify dispensing team",
        "status": "Succeeded",
        "detail": "Teams \u00b7 Stock alerts channel"
      },
      {
        "name": "Send supplier webhook",
        "status": "Succeeded",
        "detail": "Demo outgoing REST request"
      }
    ]
  },
  {
    "id": "RUN-5015",
    "workflowId": "WF-1007",
    "customerId": "CUST-1008",
    "startedAt": "2026-07-19T18:30",
    "status": "Succeeded",
    "durationSeconds": 37,
    "revenue": 0,
    "timeSavedMinutes": 11,
    "appointmentRecovered": false,
    "triggerSummary": "New customer email received",
    "steps": [
      {
        "name": "Classify message intent",
        "status": "Succeeded",
        "detail": "Booking \u00b7 Order \u00b7 Clinical \u00b7 General"
      },
      {
        "name": "Is the message urgent?",
        "status": "Succeeded",
        "detail": "Urgent \u2192 optometrist task \u00b7 Other \u2192 reception queue"
      },
      {
        "name": "Create linked staff task",
        "status": "Succeeded",
        "detail": "Customer and email attached"
      },
      {
        "name": "Draft acknowledgement",
        "status": "Succeeded",
        "detail": "Human review before sending"
      }
    ]
  },
  {
    "id": "RUN-5016",
    "workflowId": "WF-1008",
    "customerId": "CUST-1013",
    "startedAt": "2026-07-19T10:30",
    "status": "Succeeded",
    "durationSeconds": 23,
    "revenue": 0,
    "timeSavedMinutes": 18,
    "appointmentRecovered": false,
    "triggerSummary": "New customer created",
    "steps": [
      {
        "name": "Send welcome email",
        "status": "Succeeded",
        "detail": "Practice information and directions"
      },
      {
        "name": "Request medical history form",
        "status": "Succeeded",
        "detail": "Secure customer form link"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Check form completion"
      },
      {
        "name": "Form completed?",
        "status": "Succeeded",
        "detail": "No \u2192 create reception task \u00b7 Yes \u2192 finish"
      }
    ]
  },
  {
    "id": "RUN-5017",
    "workflowId": "WF-1001",
    "customerId": "CUST-1035",
    "startedAt": "2026-07-19T07:30",
    "status": "Succeeded",
    "durationSeconds": 28,
    "revenue": 0,
    "timeSavedMinutes": 8,
    "appointmentRecovered": false,
    "triggerSummary": "Recall due within 30 days",
    "steps": [
      {
        "name": "Send personalised recall email",
        "status": "Succeeded",
        "detail": "Outlook \u00b7 Recall template"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Continue only if no appointment is booked"
      },
      {
        "name": "Has the customer booked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 finish \u00b7 No \u2192 continue"
      },
      {
        "name": "Send WhatsApp reminder",
        "status": "Succeeded",
        "detail": "WhatsApp Business \u00b7 Consent checked"
      },
      {
        "name": "Create reception call task",
        "status": "Succeeded",
        "detail": "Due in 2 working days"
      }
    ]
  },
  {
    "id": "RUN-5018",
    "workflowId": "WF-1002",
    "customerId": "CUST-1029",
    "startedAt": "2026-07-19T01:30",
    "status": "Succeeded",
    "durationSeconds": 34,
    "revenue": 0,
    "timeSavedMinutes": 10,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment starts in 24 hours",
    "steps": [
      {
        "name": "Send appointment confirmation",
        "status": "Succeeded",
        "detail": "SMS \u00b7 Includes date, time and practitioner"
      },
      {
        "name": "Wait 4 hours",
        "status": "Succeeded",
        "detail": "Pause for customer response"
      },
      {
        "name": "Customer response",
        "status": "Succeeded",
        "detail": "Confirmed \u2192 update booking \u00b7 Change requested \u2192 task"
      },
      {
        "name": "Notify reception of changes",
        "status": "Succeeded",
        "detail": "Microsoft Teams \u00b7 Front desk channel"
      }
    ]
  },
  {
    "id": "RUN-5019",
    "workflowId": "WF-1003",
    "customerId": "CUST-1032",
    "startedAt": "2026-07-18T20:30",
    "status": "Succeeded",
    "durationSeconds": 26,
    "revenue": 0,
    "timeSavedMinutes": 8,
    "appointmentRecovered": true,
    "triggerSummary": "Appointment marked No-show",
    "steps": [
      {
        "name": "Send rebooking WhatsApp",
        "status": "Succeeded",
        "detail": "Includes next available appointment link"
      },
      {
        "name": "Wait 2 days",
        "status": "Succeeded",
        "detail": "Stop when a new booking is found"
      },
      {
        "name": "Rebooked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 record recovery \u00b7 No \u2192 call task"
      },
      {
        "name": "Create priority call task",
        "status": "Succeeded",
        "detail": "Reception \u00b7 Medium priority"
      }
    ]
  },
  {
    "id": "RUN-5020",
    "workflowId": "WF-1004",
    "customerId": "CUST-1006",
    "startedAt": "2026-07-18T17:30",
    "status": "Succeeded",
    "durationSeconds": 33,
    "revenue": 95,
    "timeSavedMinutes": 4,
    "appointmentRecovered": false,
    "triggerSummary": "New prescription recorded",
    "steps": [
      {
        "name": "Create frame and lens opportunity",
        "status": "Succeeded",
        "detail": "Uses age, prescription and purchase history"
      },
      {
        "name": "Optometrist reviews recommendation",
        "status": "Succeeded",
        "detail": "No customer message until approved"
      },
      {
        "name": "Send approved product email",
        "status": "Succeeded",
        "detail": "Personalised options without clinical claims"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Check whether a sale was recorded"
      },
      {
        "name": "Create retail follow-up task",
        "status": "Succeeded",
        "detail": "Dispensing team"
      }
    ]
  },
  {
    "id": "RUN-5021",
    "workflowId": "WF-1005",
    "customerId": "CUST-1005",
    "startedAt": "2026-07-18T09:30",
    "status": "Succeeded",
    "durationSeconds": 40,
    "revenue": 220,
    "timeSavedMinutes": 15,
    "appointmentRecovered": false,
    "triggerSummary": "Contact lens supply reaches estimated reorder date",
    "steps": [
      {
        "name": "Send reorder reminder email",
        "status": "Succeeded",
        "detail": "Shows usual product and quantity"
      },
      {
        "name": "Online order received?",
        "status": "Succeeded",
        "detail": "Yes \u2192 reserve stock \u00b7 No \u2192 wait"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Follow up once"
      },
      {
        "name": "Create dispensing call task",
        "status": "Succeeded",
        "detail": "Only when no order exists"
      }
    ]
  },
  {
    "id": "RUN-5022",
    "workflowId": "WF-1006",
    "customerId": "CUST-1037",
    "startedAt": "2026-07-18T06:30",
    "status": "Succeeded",
    "durationSeconds": 40,
    "revenue": 0,
    "timeSavedMinutes": 9,
    "appointmentRecovered": false,
    "triggerSummary": "Product stock at or below reorder level",
    "steps": [
      {
        "name": "Create stock purchase request",
        "status": "Succeeded",
        "detail": "Suggested quantity restores four weeks of stock"
      },
      {
        "name": "Manager approves supplier order",
        "status": "Succeeded",
        "detail": "Approval required over \u00a3250"
      },
      {
        "name": "Notify dispensing team",
        "status": "Succeeded",
        "detail": "Teams \u00b7 Stock alerts channel"
      },
      {
        "name": "Send supplier webhook",
        "status": "Succeeded",
        "detail": "Demo outgoing REST request"
      }
    ]
  },
  {
    "id": "RUN-5023",
    "workflowId": "WF-1007",
    "customerId": "CUST-1012",
    "startedAt": "2026-07-18T02:30",
    "status": "Succeeded",
    "durationSeconds": 44,
    "revenue": 0,
    "timeSavedMinutes": 6,
    "appointmentRecovered": false,
    "triggerSummary": "New customer email received",
    "steps": [
      {
        "name": "Classify message intent",
        "status": "Succeeded",
        "detail": "Booking \u00b7 Order \u00b7 Clinical \u00b7 General"
      },
      {
        "name": "Is the message urgent?",
        "status": "Succeeded",
        "detail": "Urgent \u2192 optometrist task \u00b7 Other \u2192 reception queue"
      },
      {
        "name": "Create linked staff task",
        "status": "Succeeded",
        "detail": "Customer and email attached"
      },
      {
        "name": "Draft acknowledgement",
        "status": "Succeeded",
        "detail": "Human review before sending"
      }
    ]
  },
  {
    "id": "RUN-5024",
    "workflowId": "WF-1008",
    "customerId": "CUST-1022",
    "startedAt": "2026-07-17T19:30",
    "status": "Succeeded",
    "durationSeconds": 24,
    "revenue": 0,
    "timeSavedMinutes": 16,
    "appointmentRecovered": false,
    "triggerSummary": "New customer created",
    "steps": [
      {
        "name": "Send welcome email",
        "status": "Succeeded",
        "detail": "Practice information and directions"
      },
      {
        "name": "Request medical history form",
        "status": "Succeeded",
        "detail": "Secure customer form link"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Check form completion"
      },
      {
        "name": "Form completed?",
        "status": "Succeeded",
        "detail": "No \u2192 create reception task \u00b7 Yes \u2192 finish"
      }
    ]
  },
  {
    "id": "RUN-5025",
    "workflowId": "WF-1001",
    "customerId": "CUST-1016",
    "startedAt": "2026-07-17T14:30",
    "status": "Succeeded",
    "durationSeconds": 8,
    "revenue": 0,
    "timeSavedMinutes": 6,
    "appointmentRecovered": true,
    "triggerSummary": "Recall due within 30 days",
    "steps": [
      {
        "name": "Send personalised recall email",
        "status": "Succeeded",
        "detail": "Outlook \u00b7 Recall template"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Continue only if no appointment is booked"
      },
      {
        "name": "Has the customer booked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 finish \u00b7 No \u2192 continue"
      },
      {
        "name": "Send WhatsApp reminder",
        "status": "Succeeded",
        "detail": "WhatsApp Business \u00b7 Consent checked"
      },
      {
        "name": "Create reception call task",
        "status": "Succeeded",
        "detail": "Due in 2 working days"
      }
    ]
  },
  {
    "id": "RUN-5026",
    "workflowId": "WF-1002",
    "customerId": "CUST-1012",
    "startedAt": "2026-07-17T11:30",
    "status": "Succeeded",
    "durationSeconds": 29,
    "revenue": 0,
    "timeSavedMinutes": 9,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment starts in 24 hours",
    "steps": [
      {
        "name": "Send appointment confirmation",
        "status": "Succeeded",
        "detail": "SMS \u00b7 Includes date, time and practitioner"
      },
      {
        "name": "Wait 4 hours",
        "status": "Succeeded",
        "detail": "Pause for customer response"
      },
      {
        "name": "Customer response",
        "status": "Succeeded",
        "detail": "Confirmed \u2192 update booking \u00b7 Change requested \u2192 task"
      },
      {
        "name": "Notify reception of changes",
        "status": "Succeeded",
        "detail": "Microsoft Teams \u00b7 Front desk channel"
      }
    ]
  },
  {
    "id": "RUN-5027",
    "workflowId": "WF-1003",
    "customerId": "CUST-1044",
    "startedAt": "2026-07-17T05:30",
    "status": "Succeeded",
    "durationSeconds": 4,
    "revenue": 0,
    "timeSavedMinutes": 14,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment marked No-show",
    "steps": [
      {
        "name": "Send rebooking WhatsApp",
        "status": "Succeeded",
        "detail": "Includes next available appointment link"
      },
      {
        "name": "Wait 2 days",
        "status": "Succeeded",
        "detail": "Stop when a new booking is found"
      },
      {
        "name": "Rebooked?",
        "status": "Succeeded",
        "detail": "Yes \u2192 record recovery \u00b7 No \u2192 call task"
      },
      {
        "name": "Create priority call task",
        "status": "Succeeded",
        "detail": "Reception \u00b7 Medium priority"
      }
    ]
  },
  {
    "id": "RUN-5028",
    "workflowId": "WF-1004",
    "customerId": "CUST-1027",
    "startedAt": "2026-07-17T00:30",
    "status": "Succeeded",
    "durationSeconds": 39,
    "revenue": 95,
    "timeSavedMinutes": 4,
    "appointmentRecovered": false,
    "triggerSummary": "New prescription recorded",
    "steps": [
      {
        "name": "Create frame and lens opportunity",
        "status": "Succeeded",
        "detail": "Uses age, prescription and purchase history"
      },
      {
        "name": "Optometrist reviews recommendation",
        "status": "Succeeded",
        "detail": "No customer message until approved"
      },
      {
        "name": "Send approved product email",
        "status": "Succeeded",
        "detail": "Personalised options without clinical claims"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Check whether a sale was recorded"
      },
      {
        "name": "Create retail follow-up task",
        "status": "Succeeded",
        "detail": "Dispensing team"
      }
    ]
  },
  {
    "id": "RUN-5029",
    "workflowId": "WF-1005",
    "customerId": "CUST-1032",
    "startedAt": "2026-07-16T18:30",
    "status": "Waiting approval",
    "durationSeconds": 34,
    "revenue": 0,
    "timeSavedMinutes": 10,
    "appointmentRecovered": false,
    "triggerSummary": "Contact lens supply reaches estimated reorder date",
    "steps": [
      {
        "name": "Send reorder reminder email",
        "status": "Succeeded",
        "detail": "Shows usual product and quantity"
      },
      {
        "name": "Online order received?",
        "status": "Succeeded",
        "detail": "Yes \u2192 reserve stock \u00b7 No \u2192 wait"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Follow up once"
      },
      {
        "name": "Create dispensing call task",
        "status": "Succeeded",
        "detail": "Only when no order exists"
      }
    ]
  },
  {
    "id": "RUN-5030",
    "workflowId": "WF-1006",
    "customerId": "CUST-1016",
    "startedAt": "2026-07-16T14:30",
    "status": "Waiting approval",
    "durationSeconds": 12,
    "revenue": 0,
    "timeSavedMinutes": 12,
    "appointmentRecovered": false,
    "triggerSummary": "Product stock at or below reorder level",
    "steps": [
      {
        "name": "Create stock purchase request",
        "status": "Succeeded",
        "detail": "Suggested quantity restores four weeks of stock"
      },
      {
        "name": "Manager approves supplier order",
        "status": "Waiting approval",
        "detail": "Approval required over \u00a3250"
      },
      {
        "name": "Notify dispensing team",
        "status": "Not started",
        "detail": "Teams \u00b7 Stock alerts channel"
      },
      {
        "name": "Send supplier webhook",
        "status": "Not started",
        "detail": "Demo outgoing REST request"
      }
    ]
  },
  {
    "id": "RUN-5031",
    "workflowId": "WF-1007",
    "customerId": "CUST-1029",
    "startedAt": "2026-07-16T10:30",
    "status": "Waiting approval",
    "durationSeconds": 28,
    "revenue": 0,
    "timeSavedMinutes": 16,
    "appointmentRecovered": false,
    "triggerSummary": "New customer email received",
    "steps": [
      {
        "name": "Classify message intent",
        "status": "Succeeded",
        "detail": "Booking \u00b7 Order \u00b7 Clinical \u00b7 General"
      },
      {
        "name": "Is the message urgent?",
        "status": "Succeeded",
        "detail": "Urgent \u2192 optometrist task \u00b7 Other \u2192 reception queue"
      },
      {
        "name": "Create linked staff task",
        "status": "Succeeded",
        "detail": "Customer and email attached"
      },
      {
        "name": "Draft acknowledgement",
        "status": "Succeeded",
        "detail": "Human review before sending"
      }
    ]
  },
  {
    "id": "RUN-5032",
    "workflowId": "WF-1008",
    "customerId": "CUST-1004",
    "startedAt": "2026-07-16T02:30",
    "status": "Waiting approval",
    "durationSeconds": 20,
    "revenue": 0,
    "timeSavedMinutes": 4,
    "appointmentRecovered": false,
    "triggerSummary": "New customer created",
    "steps": [
      {
        "name": "Send welcome email",
        "status": "Succeeded",
        "detail": "Practice information and directions"
      },
      {
        "name": "Request medical history form",
        "status": "Succeeded",
        "detail": "Secure customer form link"
      },
      {
        "name": "Wait 3 days",
        "status": "Succeeded",
        "detail": "Check form completion"
      },
      {
        "name": "Form completed?",
        "status": "Succeeded",
        "detail": "No \u2192 create reception task \u00b7 Yes \u2192 finish"
      }
    ]
  },
  {
    "id": "RUN-5033",
    "workflowId": "WF-1001",
    "customerId": "CUST-1043",
    "startedAt": "2026-07-15T22:30",
    "status": "Failed",
    "durationSeconds": 20,
    "revenue": 0,
    "timeSavedMinutes": 4,
    "appointmentRecovered": false,
    "triggerSummary": "Recall due within 30 days",
    "steps": [
      {
        "name": "Send personalised recall email",
        "status": "Succeeded",
        "detail": "Outlook \u00b7 Recall template"
      },
      {
        "name": "Wait 7 days",
        "status": "Succeeded",
        "detail": "Continue only if no appointment is booked"
      },
      {
        "name": "Has the customer booked?",
        "status": "Failed",
        "detail": "Yes \u2192 finish \u00b7 No \u2192 continue"
      },
      {
        "name": "Send WhatsApp reminder",
        "status": "Not started",
        "detail": "WhatsApp Business \u00b7 Consent checked"
      },
      {
        "name": "Create reception call task",
        "status": "Not started",
        "detail": "Due in 2 working days"
      }
    ]
  },
  {
    "id": "RUN-5034",
    "workflowId": "WF-1002",
    "customerId": "CUST-1016",
    "startedAt": "2026-07-15T16:30",
    "status": "Failed",
    "durationSeconds": 12,
    "revenue": 0,
    "timeSavedMinutes": 10,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment starts in 24 hours",
    "steps": [
      {
        "name": "Send appointment confirmation",
        "status": "Succeeded",
        "detail": "SMS \u00b7 Includes date, time and practitioner"
      },
      {
        "name": "Wait 4 hours",
        "status": "Succeeded",
        "detail": "Pause for customer response"
      },
      {
        "name": "Customer response",
        "status": "Failed",
        "detail": "Confirmed \u2192 update booking \u00b7 Change requested \u2192 task"
      },
      {
        "name": "Notify reception of changes",
        "status": "Not started",
        "detail": "Microsoft Teams \u00b7 Front desk channel"
      }
    ]
  },
  {
    "id": "RUN-5035",
    "workflowId": "WF-1003",
    "customerId": "CUST-1022",
    "startedAt": "2026-07-15T14:30",
    "status": "Failed",
    "durationSeconds": 43,
    "revenue": 0,
    "timeSavedMinutes": 18,
    "appointmentRecovered": false,
    "triggerSummary": "Appointment marked No-show",
    "steps": [
      {
        "name": "Send rebooking WhatsApp",
        "status": "Succeeded",
        "detail": "Includes next available appointment link"
      },
      {
        "name": "Wait 2 days",
        "status": "Succeeded",
        "detail": "Stop when a new booking is found"
      },
      {
        "name": "Rebooked?",
        "status": "Failed",
        "detail": "Yes \u2192 record recovery \u00b7 No \u2192 call task"
      },
      {
        "name": "Create priority call task",
        "status": "Not started",
        "detail": "Reception \u00b7 Medium priority"
      }
    ]
  },
  {
    "id": "RUN-5036",
    "workflowId": "WF-1004",
    "customerId": "CUST-1010",
    "startedAt": "2026-07-15T08:30",
    "status": "Stopped",
    "durationSeconds": 32,
    "revenue": 0,
    "timeSavedMinutes": 4,
    "appointmentRecovered": false,
    "triggerSummary": "New prescription recorded",
    "steps": [
      {
        "name": "Create frame and lens opportunity",
        "status": "Succeeded",
        "detail": "Uses age, prescription and purchase history"
      },
      {
        "name": "Optometrist reviews recommendation",
        "status": "Succeeded",
        "detail": "No customer message until approved"
      },
      {
        "name": "Send approved product email",
        "status": "Stopped",
        "detail": "Personalised options without clinical claims"
      },
      {
        "name": "Wait 7 days",
        "status": "Stopped",
        "detail": "Check whether a sale was recorded"
      },
      {
        "name": "Create retail follow-up task",
        "status": "Stopped",
        "detail": "Dispensing team"
      }
    ]
  }
];
window.DEMO_AUTOMATION_TASKS = [
  {
    "id": "TASK-7001",
    "title": "Call overdue recall customer",
    "customerId": "CUST-1017",
    "owner": "Reception",
    "dueDate": "2026-07-22",
    "priority": "High",
    "status": "Open",
    "type": "recall",
    "sourceWorkflowId": "WF-1001",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-22T16:30"
  },
  {
    "id": "TASK-7002",
    "title": "Review product recommendation",
    "customerId": "CUST-1009",
    "owner": "Dr Amelia Reed",
    "dueDate": "2026-07-23",
    "priority": "Medium",
    "status": "Pending approval",
    "type": "approval",
    "sourceWorkflowId": "WF-1002",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-22T09:30"
  },
  {
    "id": "TASK-7003",
    "title": "Confirm appointment change request",
    "customerId": "CUST-1042",
    "owner": "Reception",
    "dueDate": "2026-07-24",
    "priority": "High",
    "status": "Open",
    "type": "booking",
    "sourceWorkflowId": "WF-1003",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-22T02:30"
  },
  {
    "id": "TASK-7004",
    "title": "Approve low-stock supplier order",
    "customerId": "CUST-1034",
    "owner": "Practice Manager",
    "dueDate": "2026-07-25",
    "priority": "High",
    "status": "Pending approval",
    "type": "approval",
    "sourceWorkflowId": "WF-1004",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-21T19:30"
  },
  {
    "id": "TASK-7005",
    "title": "Follow up contact lens reorder",
    "customerId": "CUST-1047",
    "owner": "Dispensing",
    "dueDate": "2026-07-26",
    "priority": "Medium",
    "status": "Open",
    "type": "retail",
    "sourceWorkflowId": "WF-1005",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-21T12:30"
  },
  {
    "id": "TASK-7006",
    "title": "Review urgent customer email",
    "customerId": "CUST-1031",
    "owner": "Alex Morgan",
    "dueDate": "2026-07-27",
    "priority": "Urgent",
    "status": "Open",
    "type": "clinical",
    "sourceWorkflowId": "WF-1006",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-21T05:30"
  },
  {
    "id": "TASK-7007",
    "title": "Check medical history form",
    "customerId": "CUST-1002",
    "owner": "Reception",
    "dueDate": "2026-07-28",
    "priority": "Low",
    "status": "Open",
    "type": "onboarding",
    "sourceWorkflowId": "WF-1007",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-20T22:30"
  },
  {
    "id": "TASK-7008",
    "title": "Call missed appointment customer",
    "customerId": "CUST-1014",
    "owner": "Reception",
    "dueDate": "2026-07-22",
    "priority": "Medium",
    "status": "Completed",
    "type": "booking",
    "sourceWorkflowId": "WF-1008",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-20T15:30"
  },
  {
    "id": "TASK-7009",
    "title": "Approve birthday campaign audience",
    "customerId": "CUST-1024",
    "owner": "Practice Manager",
    "dueDate": "2026-07-23",
    "priority": "Medium",
    "status": "Pending approval",
    "type": "approval",
    "sourceWorkflowId": "WF-1001",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-20T08:30"
  },
  {
    "id": "TASK-7010",
    "title": "Call overdue recall customer",
    "customerId": "CUST-1010",
    "owner": "Reception",
    "dueDate": "2026-07-24",
    "priority": "High",
    "status": "Open",
    "type": "recall",
    "sourceWorkflowId": "WF-1002",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-20T01:30"
  },
  {
    "id": "TASK-7011",
    "title": "Review product recommendation",
    "customerId": "CUST-1024",
    "owner": "Dr Amelia Reed",
    "dueDate": "2026-07-25",
    "priority": "Medium",
    "status": "Pending approval",
    "type": "approval",
    "sourceWorkflowId": "WF-1003",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-19T18:30"
  },
  {
    "id": "TASK-7012",
    "title": "Confirm appointment change request",
    "customerId": "CUST-1039",
    "owner": "Reception",
    "dueDate": "2026-07-26",
    "priority": "High",
    "status": "Open",
    "type": "booking",
    "sourceWorkflowId": "WF-1004",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-19T11:30"
  },
  {
    "id": "TASK-7013",
    "title": "Approve low-stock supplier order",
    "customerId": "CUST-1050",
    "owner": "Practice Manager",
    "dueDate": "2026-07-27",
    "priority": "High",
    "status": "Pending approval",
    "type": "approval",
    "sourceWorkflowId": "WF-1005",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-19T04:30"
  },
  {
    "id": "TASK-7014",
    "title": "Follow up contact lens reorder",
    "customerId": "CUST-1028",
    "owner": "Dispensing",
    "dueDate": "2026-07-28",
    "priority": "Medium",
    "status": "Open",
    "type": "retail",
    "sourceWorkflowId": "WF-1006",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-18T21:30"
  },
  {
    "id": "TASK-7015",
    "title": "Review urgent customer email",
    "customerId": "CUST-1032",
    "owner": "Alex Morgan",
    "dueDate": "2026-07-22",
    "priority": "Urgent",
    "status": "Open",
    "type": "clinical",
    "sourceWorkflowId": "WF-1007",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-18T14:30"
  },
  {
    "id": "TASK-7016",
    "title": "Check medical history form",
    "customerId": "CUST-1038",
    "owner": "Reception",
    "dueDate": "2026-07-23",
    "priority": "Low",
    "status": "Open",
    "type": "onboarding",
    "sourceWorkflowId": "WF-1008",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-18T07:30"
  },
  {
    "id": "TASK-7017",
    "title": "Call missed appointment customer",
    "customerId": "CUST-1031",
    "owner": "Reception",
    "dueDate": "2026-07-24",
    "priority": "Medium",
    "status": "Completed",
    "type": "booking",
    "sourceWorkflowId": "WF-1001",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-18T00:30"
  },
  {
    "id": "TASK-7018",
    "title": "Approve birthday campaign audience",
    "customerId": "CUST-1020",
    "owner": "Practice Manager",
    "dueDate": "2026-07-25",
    "priority": "Medium",
    "status": "Pending approval",
    "type": "approval",
    "sourceWorkflowId": "WF-1002",
    "notes": "Created automatically from a fictional workflow run. Review the linked customer before taking action.",
    "createdAt": "2026-07-17T17:30"
  }
];
window.DEMO_CONNECTIONS = [
  {
    "id": "CONN-001",
    "name": "Microsoft Outlook",
    "icon": "O",
    "category": "Email",
    "status": "Connected",
    "lastSync": "2 minutes ago",
    "description": "Send customer email and watch the practice inbox."
  },
  {
    "id": "CONN-002",
    "name": "WhatsApp Business",
    "icon": "W",
    "category": "Messaging",
    "status": "Connected",
    "lastSync": "5 minutes ago",
    "description": "Send approved reminders using customer consent rules."
  },
  {
    "id": "CONN-003",
    "name": "Microsoft Teams",
    "icon": "T",
    "category": "Staff",
    "status": "Connected",
    "lastSync": "8 minutes ago",
    "description": "Post alerts and tasks to practice channels."
  },
  {
    "id": "CONN-004",
    "name": "Google Calendar",
    "icon": "G",
    "category": "Calendar",
    "status": "Available",
    "lastSync": "Never",
    "description": "Synchronise external calendars and practitioner availability."
  },
  {
    "id": "CONN-005",
    "name": "QuickBooks",
    "icon": "Q",
    "category": "Accounting",
    "status": "Connected",
    "lastSync": "Today at 08:40",
    "description": "Create invoices and send retail totals to accounting."
  },
  {
    "id": "CONN-006",
    "name": "Twilio SMS",
    "icon": "S",
    "category": "Messaging",
    "status": "Available",
    "lastSync": "Never",
    "description": "Send SMS confirmations and receive customer replies."
  },
  {
    "id": "CONN-007",
    "name": "Optical Laboratory API",
    "icon": "L",
    "category": "Laboratory",
    "status": "Available",
    "lastSync": "Never",
    "description": "Submit orders and receive manufacturing status updates."
  },
  {
    "id": "CONN-008",
    "name": "Webhooks & REST API",
    "icon": "{ }",
    "category": "Developer",
    "status": "Connected",
    "lastSync": "Just now",
    "description": "Receive events and call unsupported external systems."
  },
  {
    "id": "CONN-009",
    "name": "Customer Forms",
    "icon": "F",
    "category": "Forms",
    "status": "Connected",
    "lastSync": "Today at 09:15",
    "description": "Trigger workflows from registration, consent and medical forms."
  },
  {
    "id": "CONN-010",
    "name": "Customer Portal",
    "icon": "P",
    "category": "Portal",
    "status": "Preview",
    "lastSync": "Demo only",
    "description": "Let customers update details, complete forms and request bookings."
  }
];

// Missed-call recovery additions.
window.DEMO_WORKFLOWS.unshift({
  id: 'WF-1000',
  name: 'Missed-call SMS recovery',
  description: 'When the practice cannot answer, text the caller a secure link to the public AI booking assistant and track whether they book.',
  category: 'Communications',
  active: true,
  trigger: { type: 'missed_call', label: 'Practice call missed' },
  conditions: [{ field: 'Caller number', operator: 'is not', value: 'Withheld' }],
  steps: [
    { id: 'MC-S1', type: 'action', label: 'Send self-service SMS', details: 'Twilio · Public booking chatbot link' },
    { id: 'MC-S2', type: 'delay', label: 'Wait 30 minutes', details: 'Stop early if the booking assistant is opened' },
    { id: 'MC-S3', type: 'branch', label: 'Did the caller open or book?', details: 'Yes → finish · No → continue' },
    { id: 'MC-S4', type: 'action', label: 'Create reception follow-up task', details: 'Only when SMS failed or the caller did not engage' }
  ]
});
window.DEMO_AUTOMATION_TEMPLATES.unshift({
  id: 'TPL-1000',
  name: 'Missed-call to chatbot booking',
  description: 'Recover unanswered calls with an immediate SMS, self-service booking link and optional reception follow-up.',
  category: 'Communications',
  active: false,
  trigger: { type: 'missed_call', label: 'Practice call missed' },
  conditions: [{ field: 'Valid mobile number', operator: 'is', value: 'Yes' }],
  steps: [
    { type: 'action', label: 'Send missed-call SMS', details: 'Include the public AI booking link' },
    { type: 'delay', label: 'Wait 30 minutes', details: 'Continue when no booking has been made' },
    { type: 'action', label: 'Create reception task', details: 'Call back during opening hours' }
  ]
});
window.DEMO_CONNECTIONS.unshift({
  id: 'CONN-000',
  name: 'Twilio Voice & SMS',
  icon: '☎',
  category: 'Communications',
  status: 'Available',
  lastSync: 'Configure in .env',
  description: 'Receive missed-call webhooks and send an SMS link to the public booking chatbot.'
});
