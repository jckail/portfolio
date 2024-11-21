"""
Test script to verify data loading from JSON files into Pydantic models.
"""

from .data_loader import load_all, load_experience, load_projects, load_skills, load_aboutme, load_contact

def test_individual_loaders():
    """Test each loader individually to provide specific error messages."""
    try:
        print("Testing individual loaders...")
        
        print("\nLoading experience data...")
        experience = load_experience()
        print("✅ Experience data loaded successfully")
        
        print("\nLoading projects data...")
        projects = load_projects()
        print("✅ Projects data loaded successfully")
        
        print("\nLoading skills data...")
        skills = load_skills()
        print("✅ Skills data loaded successfully")
        
        print("\nLoading about me data...")
        aboutme = load_aboutme()
        print("✅ About me data loaded successfully")
        
        print("\nLoading contact data...")
        contact = load_contact()
        print("✅ Contact data loaded successfully")
        
        return True
    except Exception as e:
        print(f"❌ Error during individual loading: {str(e)}")
        return False

def test_bulk_loader():
    """Test loading all data at once."""
    try:
        print("\nTesting bulk loader...")
        all_data = load_all()
        print("✅ All data loaded successfully")
        
        # Print model counts for verification
        print("\nVerification counts:")
        print(f"Experience entries: {len(all_data['experience'].__dict__)}")
        print(f"Projects entries: {len(all_data['projects'].__dict__)}")
        print(f"Skills entries: {len(all_data['skills'].root)}")
        print(f"About me fields: {len(all_data['aboutme'].__dict__)}")
        print(f"Contact fields: {len(all_data['contact'].__dict__)}")
        
        return True
    except Exception as e:
        print(f"❌ Error during bulk loading: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting data loader tests...\n")
    
    individual_success = test_individual_loaders()
    bulk_success = test_bulk_loader()
    
    if individual_success and bulk_success:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. Please check the error messages above.")
