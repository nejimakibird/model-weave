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

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Steps

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

| id | label | kind | layout | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## Actions

| id | label | kind | target | event | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Notes

## Local Processes
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
