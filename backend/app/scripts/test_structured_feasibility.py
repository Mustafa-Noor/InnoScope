"""
Test script for structured feasibility assessment.
Run from backend directory: python -m app.scripts.test_structured_feasibility
"""

import json
from app.schemas.feasibility_new import StructuredFeasibilityInput
from app.pipelines.builds.feasibility_pipeline_new import run_feasibility_assessment, convert_state_to_report

def test_structured_assessment():
    """Test the complete feasibility assessment pipeline."""
    
    print("=" * 80)
    print("STRUCTURED FEASIBILITY ASSESSMENT TEST")
    print("=" * 80)
    
    # Create test input
    test_input = StructuredFeasibilityInput(
        product_domain="Healthcare",
        application_area="Disease Prediction",
        problem_clarity_score=4,
        technical_complexity_score=3,
        technology_maturity_score=4,
        data_availability_score=3,
        infrastructure_requirement_score=2,
        experimental_validation_score=3,
        baseline_comparison_flag=1,
        real_world_testing_flag=0,
        limitations_discussed_flag=1,
        rd_cost_estimate=250000,
        startup_cost_estimate=150000,
        resource_availability_score=4,
        time_to_market_months=12,
        target_market_size=500,
        competition_level=3,
        projected_adoption_rate=0.25,
        unique_selling_proposition_score=4,
        projected_roi=2.5,
        regulatory_compliance_flag=1,
        legal_risk_flag=0,
        risk_level_score=2,
        summary="AI-powered disease prediction system using patient medical data and ML models",
        key_challenges=["Data privacy regulations", "Model validation", "Clinical adoption"],
        key_opportunities=["Growing telehealth market", "Regulatory incentives", "Hospital partnerships"]
    )
    
    print(f"\nProject ID: {test_input.project_id}")
    print(f"Domain: {test_input.product_domain}")
    print(f"Application: {test_input.application_area}")
    print(f"Summary: {test_input.summary}")
    
    print("\n" + "-" * 80)
    print("Running assessment pipeline...")
    print("-" * 80)
    
    try:
        # Run pipeline
        state = run_feasibility_assessment(test_input)
        
        # Convert to report
        report = convert_state_to_report(state)
        
        # Display results
        print(f"\n✓ Assessment Complete!")
        print(f"  Final Score: {report.final_score}/100")
        print(f"  Status: {report.viability_status}")
        print(f"  ML Score: {report.ml_score:.1f}/100 (Confidence: {report.ml_confidence:.0%})")
        
        print("\n" + "-" * 80)
        print("DIMENSION SCORES")
        print("-" * 80)
        print(f"  Technical:  {report.technical_score}/100")
        print(f"  Resource:   {report.resource_score}/100")
        print(f"  Skills:     {report.skills_score}/100")
        print(f"  Scope:      {report.scope_score}/100")
        print(f"  Risk:       {report.risk_score}/100")
        
        if report.relevant_papers:
            print("\n" + "-" * 80)
            print(f"RELEVANT PAPERS ({len(report.relevant_papers)} found)")
            print("-" * 80)
            for i, paper in enumerate(report.relevant_papers[:3], 1):
                print(f"{i}. {paper.title[:60]}...")
                print(f"   Relevance: {paper.relevance_score:.2f}")
        
        if report.key_risks:
            print("\n" + "-" * 80)
            print("KEY RISKS")
            print("-" * 80)
            for i, risk in enumerate(report.key_risks, 1):
                print(f"{i}. {risk}")
        
        if report.recommendations:
            print("\n" + "-" * 80)
            print("RECOMMENDATIONS")
            print("-" * 80)
            for i, rec in enumerate(report.recommendations, 1):
                print(f"{i}. {rec}")
        
        print("\n" + "-" * 80)
        print("EXPLANATION")
        print("-" * 80)
        print(report.explanation)
        
        print("\n" + "=" * 80)
        print("TEST PASSED ✓")
        print("=" * 80)
        
        return report
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    test_structured_assessment()
