import sys

with open('src/hooks/useAllocations.ts', 'r', encoding='utf-8') as f:
    text = f.read()

to_insert = """        if (allocations.length > 0) {
          const toInsert = allocations.map((a: any) => {
            delete a.id;
            return {
              ...a,
              user_id: userId,
              allocation_date: date
            };
          });"""

new_to_insert = """        if (allocations.length > 0) {
          const toInsert = allocations.map((a: any) => {
            delete a.id;
            delete a.is_approved;
            return {
              ...a,
              user_id: userId,
              allocation_date: date,
              is_approved: !!isManagerOrAdmin
            };
          });"""

text = text.replace(to_insert, new_to_insert)

with open('src/hooks/useAllocations.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed useSaveDayAllocations")
