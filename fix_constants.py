import sys

with open('src/lib/constants.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_csv = """export const SAMPLE_CSV_CONTENT = `Employee ID,First Name,Last Name,Personal Email,Phone Number,Role,Department,Entity,Zone
KGAC-101,John,Doe,john.doe@gmail.com,+919876543210,audit_executive,Engineering,KGAC,North
KGAC-102,Jane,Smith,jane.smith@outlook.com,+918765432109,audit_manager,Design,KPL,South
KGAC-103,Alice,Brown,alice.b@gmail.com,+917654321098,employee,Engineering,KGAC,East
KGAC-104,Charlie,Davis,charlie.d@yahoo.com,+916543210987,employee,Operations,XSPL,West`;"""

new_csv = """export const SAMPLE_CSV_CONTENT = `Employee ID,First Name,Last Name,Personal Email,Phone Number,Role,Department,Entity,Zone,Monthly Salary
KGAC-101,John,Doe,john.doe@gmail.com,+919876543210,audit_executive,Engineering,KGAC,North,220000
KGAC-102,Jane,Smith,jane.smith@outlook.com,+918765432109,audit_manager,Design,KPL,South,350000
KGAC-103,Alice,Brown,alice.b@gmail.com,+917654321098,employee,Engineering,KGAC,East,150000
KGAC-104,Charlie,Davis,charlie.d@yahoo.com,+916543210987,employee,Operations,XSPL,West,120000`;"""

text = text.replace(old_csv, new_csv)

with open('src/lib/constants.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: constants.ts updated.")
