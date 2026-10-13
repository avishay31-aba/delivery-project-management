# Delivery ERP -> Salesforce Icon Handoff

This finalized package maps in-scope Delivery ERP icons to Salesforce SLDS icons or supplied SVG static-resource assets. Product-logo/product-identity icons are out of scope and have been removed.

## Contents

- `DeliveryERP-Salesforce-Icon-Catalog.xlsx`: Excel workbook with Icon Catalog, Business Status Icons, and Summary sheets.
- `DeliveryERP-Salesforce-Icon-Catalog.csv`: CSV version of the Icon Catalog sheet.
- `delivery-erp-salesforce-icon-map.json`: machine-readable finalized mapping.
- `svg/`: supplied ERP SVG assets required for business-status preservation or object navigation where SLDS would change meaning.

## Final Counts

- Unique ERP visual icons: 65
- Distinct ERP purpose/status mappings: 49
- Business status/value mappings: 51
- Exact native SLDS mappings: 34
- Closest SLDS mappings: 13
- Custom/static SVG assets supplied: 21
- Remaining Product Architect review mappings: 0
- Excluded product-logo mappings: 7

## Approved Rules Applied

- Product-logo/product-identity mappings are excluded from this Salesforce handoff package.
- Generic UI, action, sorting, filtering, view-toggle, drag/reorder, link, and ordinary navigation icons use SLDS when the function is preserved.
- Business-status icons use supplied ERP SVG assets to preserve Delivery ERP visual language.
- Projects and Systems object navigation do not use misleading Salesforce object/database icons; supplied ERP SVGs are used.
- New and Updated remain `No icon - text only`, matching the current ERP implementation.

## Size Notes

The catalog preserves ERP intrinsic size, SVG viewBox, rendered pixel dimensions, Tailwind/CSS sizing class, surrounding container size, recommended Salesforce size, and Salesforce implementation notes.

## Source

- Branch: `codex/v1.3-time-zone-documents-standardization`
- HEAD: `ca4a035e1dd547af3b7318bc0f4df5b69d546cc5`
- Lucide source: `lucide-react@0.511.0` (ISC license)
