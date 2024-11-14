from app.models.helper import count_skills

if __name__ == "__main__":
    total = count_skills()
    print(f"Total number of skills: {total}")
