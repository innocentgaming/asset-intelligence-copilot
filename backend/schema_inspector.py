"""
Schema Inspector and Data Loader Verification Script.
Inspects all data structures, validates schemas, and generates a structured report.
"""
import os
import json
from backend.data_indexer import DataIndexer

def inspect_dataset(data_path="dataset/sample-data"):
    indexer = DataIndexer(data_path)
    
    report = {
        "dataset_root": os.path.abspath(data_path),
        "total_wells": len(indexer.wells_metadata),
        "well_types": {},
        "areas": list(indexer.areas.keys()),
        "teams": list(indexer.teams.keys()),
        "users": len(indexer.users),
        "counts": {
            "metadata_records": len(indexer.wells_metadata),
            "inspections": sum(len(v) for v in indexer.inspections.values()),
            "maintenance_records": sum(len(v) for v in indexer.maintenance.values()),
            "regulatory_events": sum(len(v) for v in indexer.regulatory_events.values()),
            "context_notes": sum(len(v) for v in indexer.context_notes.values()),
            "maintenance_reports": sum(len(v) for v in indexer.maintenance_reports.values()),
        },
        "sample_schemas": {}
    }
    
    # Well types & thresholds
    for wt, thresh in indexer.well_type_thresholds.items():
        doc_present = wt in indexer.well_types_docs
        report["well_types"][wt] = {
            "threshold_celsius": thresh,
            "manual_loaded": doc_present
        }
    
    # Sample schemas
    sample_well = next(iter(indexer.wells_metadata.keys()), None)
    if sample_well:
        report["sample_schemas"]["metadata"] = list(indexer.wells_metadata[sample_well].keys())
        
        if indexer.inspections.get(sample_well):
            report["sample_schemas"]["inspection"] = list(indexer.inspections[sample_well][0].keys())
            report["sample_schemas"]["inspection_example"] = indexer.inspections[sample_well][-1]
            
        if indexer.maintenance.get(sample_well):
            report["sample_schemas"]["maintenance"] = list(indexer.maintenance[sample_well][0].keys())
            
        if indexer.regulatory_events.get(sample_well):
            report["sample_schemas"]["regulatory_event"] = list(indexer.regulatory_events[sample_well][0].keys())
            
        if indexer.context_notes.get(sample_well):
            report["sample_schemas"]["context_note"] = list(indexer.context_notes[sample_well][0].keys())
            
        if indexer.maintenance_reports.get(sample_well):
            report["sample_schemas"]["maintenance_report_example_id"] = list(indexer.maintenance_reports[sample_well].keys())[0]

    return report

if __name__ == "__main__":
    report = inspect_dataset()
    print("=" * 60)
    print("  DATASET SCHEMA INSPECTION REPORT")
    print("=" * 60)
    print(f"Dataset Root: {report['dataset_root']}")
    print(f"Total Wells Loaded: {report['total_wells']}")
    print(f"Total Inspections: {report['counts']['inspections']:,}")
    print(f"Total Maintenance Records: {report['counts']['maintenance_records']:,}")
    print(f"Total Regulatory Events: {report['counts']['regulatory_events']:,}")
    print(f"Total Context Notes: {report['counts']['context_notes']:,}")
    print(f"Total Free-Text Maintenance Reports: {report['counts']['maintenance_reports']:,}")
    print("\nWell Types & Dynamic Thresholds:")
    for wt, info in report["well_types"].items():
        print(f"  - {wt}: threshold delta >= {info['threshold_celsius']}°C (Manual loaded: {info['manual_loaded']})")
    
    print("\nSample Inspection Fields:")
    print(" ", report["sample_schemas"].get("inspection"))
    print("\nLatest Inspection Example (WELL-0001):")
    print(" ", json.dumps(report["sample_schemas"].get("inspection_example"), indent=2))
    print("=" * 60)
