export const MODEL_WEAVE_TEMPLATES = {
  class: `---
type: class
id: CLS-
name:
kind: class
package:
stereotype:
tags:
  - Class
---

# 

## Summary



## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|

## Notes

- `,
  classDiagram: `---
type: class_diagram
id: CLASSD-
name:
tags:
  - Class
  - Diagram
---

# 

## Summary



## Objects

| ref | notes |
|---|---|

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|

## Notes

- `,
  erEntity: `---
type: er_entity
id: ENT-
logical_name:
physical_name:
schema_name:
dbms:
tags:
  - ER
  - Entity
---

#  / 

## Overview

- purpose:
- notes:

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|

## Relations

### REL-
- target_table: [[]]
- kind: fk
- cardinality:
- notes:

| local_column | target_column | notes |
|---|---|---|

## Notes

- `,
  erDiagram: `---
type: er_diagram
id: ERD-
name:
tags:
  - ER
  - Diagram
---

# 

## Summary



## Objects

| ref | notes |
|---|---|

## Notes

- `
,
  dfdObject: `---
type: dfd_object
id: DFD-
name:
kind: process
tags:
  - DFD
---

# 

## Summary

## Notes
`,
  dfdDiagram: `---
type: dfd_diagram
id: DFD-
name:
level: 0
tags:
  - DFD
  - Diagram
---

# 

## Summary

## Objects

| ref | notes |
|---|---|
|  |  |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Notes
`,
  dataObject: `---
type: data_object
id:
name:
kind:
data_format: object
tags:
  - DataObject
---

# 

## Summary

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
|  |  |  |  |  |  |  |  |

## Notes
`,
  dataObjectFileLayout: `---
type: data_object
id:
name:
kind: file
data_format:
encoding:
delimiter:
line_ending:
has_header:
record_length:
tags:
  - DataObject
  - File
---

# 

## Summary

## Format

| key | value | notes |
|---|---|---|
|  |  |  |

## Records

| record_type | name | occurrence | notes |
|---|---|---|---|
|  |  |  |  |

## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |

## Notes
`,
  appProcess: `---
type: app_process
id: PROC-
name:
kind:
tags:
  - AppProcess
---

# 

## Summary

## Source Links

| path | notes |
|---|---|
| src/app/processes/ExampleProcess.ts | Example implementation |

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Outputs

| id | data | target | notes |
|---|---|---|---|
|  |  |  |  |

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| step1 | User | Submit request | start | IN-REQUEST |  |  |  | SCR-REQUEST | User starts the process |
| step2 | System | Validate request | process | IN-REQUEST | VALIDATED-REQUEST | RULE-VALIDATE |  |  | Check required values |
| step3 | Screen | Show result | end | VALIDATED-REQUEST | OUT-RESULT |  |  | SCR-RESULT | Present the result |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| step1 | step2 |  | submit |  |
| step2 | step3 | [[CODE-INVENTORY-STATUS]].available | show result | Flows.from/to are internal step ids; Flows.condition may contain structured references |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Errors

## Notes
`,
  screen: `---
type: screen
id: SCR-
name:
screen_type:
tags:
  - Screen
---

# 

## Summary

## Layout

| id | label | kind | purpose | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Notes

## Local Processes

### PROC-CLEAR

#### Summary

#### Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
|  |  |  |  |  |

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

#### Outputs

| id | data | target | notes |
|---|---|---|---|
|  |  |  |  |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
|  |  |  |  |
`,
  codeSet: `---
type: codeset
id:
name:
kind:
tags:
  - CodeSet
---

# 

## Summary

## Values

| code | label | sort_order | active | notes |
|---|---|---:|---|---|

## Notes
`,
  message: `---
type: message
id:
name:
kind:
tags:
  - Message
---

# 

## Summary

## Messages

| message_id | text | severity | timing | audience | active | notes |
|---|---|---|---|---|---|---|

## Notes
`,
  rule: `---
type: rule
id:
name:
kind:
tags:
  - Rule
---

# 

## Summary

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|

## References

| ref | usage | notes |
|---|---|---|

## Conditions

| id | condition | ref | value | notes |
|---|---|---|---|---|
| CND-001 | [[CODE-INVENTORY-STATUS]].available | [[CODE-INVENTORY-STATUS]] | available | 良品利用可の在庫のみ対象 |

Prose Conditions are human-readable. Table Conditions are analyzer-readable. \`condition\` may contain \`[[CODE-ID]].value\`; \`ref + value\` may also express a codeset value reference.

## Messages

| condition | message | severity | notes |
|---|---|---|---|

## Notes
`,
  mapping: `---
type: mapping
id:
name:
kind:
source:
target:
tags:
  - Mapping
---

# 

## Summary

## Scope

| role | ref | notes |
|---|---|---|

## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|

## Rules

## Notes
`,
  domains: `---
type: domains
id: DOMAIN-SAMPLE
title: Domain Sample
---

# Domain Sample

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| business_domain | Business Domain | business |  | Business capability area |
| application_domain | Application Domain | application | business_domain | Application capability area |
| data_domain | Data Domain | data | business_domain | Data management area |
| integration_domain | Integration Domain | integration | business_domain | External integration area |

## Notes

- \`kind\` is used by color_scheme when supported views apply colors.
- \`parent\` references another \`Domains.id\` in the same file.
- Domains Tree view and Domain Diagram Tree view can apply colors by kind.
`,
  domainDiagram: `---
type: domain_diagram
id: DOMAIN-DIAGRAM-SAMPLE
title: Domain Diagram Sample
---

# Domain Diagram Sample

## Domain Sources

| ref | notes |
|---|---|
| [[DOMAIN-SAMPLE]] | Sample domain source |

## Notes

- Domain Diagram combines one or more \`domains\` files.
- Tree view can use \`color_scheme\` for Domain kind colors.
- Add more rows to \`Domain Sources\` when combining multiple domain files.
`,
  colorScheme: `---
type: color_scheme
id: color-scheme-default
name: DefaultColorScheme
tags:
  - ColorScheme
---

# DefaultColorScheme

## Summary

Default color scheme for supported Model Weave views.

Set \`defaultColorSchemeRef\` to \`[[color-scheme-default]]\` in Model Weave settings to use this color scheme.

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
|  | business | #4f81bd | #2f5597 | #ffffff | Global business color |
|  | application | #9bbb59 | #6f8a3f | #000000 | Global application color |
|  | data | #8064a2 | #60497a | #ffffff | Global data color |
|  | integration | #f79646 | #c55a11 | #000000 | Global integration color |
| domain | business | #4f81bd | #2f5597 | #ffffff | Domain-specific business color |
| domain | application | #9bbb59 | #6f8a3f | #000000 | Domain-specific application color |
| domain | data | #8064a2 | #60497a | #ffffff | Domain-specific data color |
| domain | integration | #f79646 | #c55a11 | #000000 | Domain integration color |
| domain | operations | #7f7f7f | #595959 | #ffffff | Domain operations color |
| domain | external | #a6a6a6 | #7f7f7f | #000000 | Domain external color |

## Notes

- Empty \`target\` means a global kind color.
- Target-specific rows override global rows for the same \`kind\`.
- Current runtime color application is limited to Domains Tree and Domain Diagram Tree views.
- Colors use HEX values.
- \`fill\` controls node background color.
- \`stroke\` controls node border color.
- \`text\` controls node text color.
- Do not define the same \`target + kind\` pair more than once.
`
} as const;

export type ModelWeaveTemplateKey = keyof typeof MODEL_WEAVE_TEMPLATES;

export const MODEL_WEAVE_RELATION_TEMPLATES = {
  erRelationBlock: [
    "### REL-",
    "- target_table: [[]]",
    "- kind: fk",
    "- cardinality:",
    "- notes:",
    "",
    "| local_column | target_column | notes |",
    "|---|---|---|"
  ]
} as const;
