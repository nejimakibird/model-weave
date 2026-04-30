---
type: data_object
id: DATA-FORMAT-CATALOG
name: Model Weave Format Catalog
kind: catalog
tags:
  - ModelWeave
  - Catalog
---

# Model Weave Format Catalog

A list of Markdown-based model formats supported by Model Weave.

## Summary

Defines the Markdown model file formats recognized and processed by the Model Weave plugin. Each format supports a specific modeling purpose and has its own structure and rendering policy.

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---|---|---|---|---|
| id | Format ID | string | | Y | | | Unique format identifier; often used as part of the file name. |
| name | Format Name | string | | Y | | | Display name of the format. |
| fileType | File Type | string | | Y | | | File type recognized internally by Model Weave. |
| schema | Schema Version | string | | Y | | | Schema version of the format. |
| category | Category | string | | Y | | | Classification as stable or experimental. |
| purpose | Purpose | string | | Y | | | Primary purpose of the format. |
| frontmatter_type | Frontmatter Type | string | | Y | | | Value of `type` specified in frontmatter. |
| defaultRenderMode | Default Render Mode | string | | Y | | | Default rendering mode for this format. |
| docsRef | Documentation | string | | Y | | [[docs/formats/README.md]] | Reference to related official documentation. |
| class | Class | string | | Y | | | Class definition for class diagrams. |
| class_diagram | Class Diagram | string | | Y | | | Class diagram definition. |
| er_entity | ER Entity | string | | Y | | | ER entity definition. |
| er_diagram | ER Diagram | string | | Y | | | ER diagram definition. |
| dfd_object | DFD Object | string | | Y | | | DFD object definition. |
| dfd_diagram | DFD Diagram | string | | Y | | | DFD definition. |
| data_object | Data Object | string | | Y | | | Data structure definition. |
| screen | Screen | string | | Y | | | UI screen definition. |
| app_process | App Process | string | | Y | | | Application process definition. |
| rule | Rule | string | | Y | | | Business rule definition. |
| mapping | Mapping | string | | Y | | | Data mapping definition. |
| codeset | Codeset | string | | Y | | | Codeset definition. |
| message | Message | string | | Y | | | Message set definition. |

## Notes

- `fileType` is an internal identifier, and `frontmatter_type` is the value of the `type` property specified in the Markdown file frontmatter.
- `category` is based on the "Stable / primary formats" and "Experimental / evolving formats" sections of `README.md`.