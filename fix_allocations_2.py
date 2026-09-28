import sys

with open('src/hooks/useAllocations.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start_str = "        if (allocations.length > 0) {"
end_str = "        const { error } = await supabase.from('allocations').insert(toInsert);"

start_idx = text.find(start_str)
end_idx = text.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_block = """        if (allocations.length > 0) {
          const toInsert = allocations.map((a: any) => {
            delete a.id;
            delete a.is_approved;
            return {
              ...a,
              user_id: userId,
              allocation_date: date,
              is_approved: !!isManagerOrAdmin
            };
          });
"""
    text = text[:start_idx] + new_block + text[end_idx:]

with open('src/hooks/useAllocations.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed useSaveDayAllocations")
