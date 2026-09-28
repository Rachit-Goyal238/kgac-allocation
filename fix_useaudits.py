import sys
import re

with open('src/hooks/useAudits.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add useCompleteAudit hook
new_hook = """export function useCompleteAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (auditId: string) => {
      const { error } = await supabase.rpc('complete_audit', { p_audit_id: auditId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Audit marked as completed');
    },
    onError: (error: any) => {
      toast.error(`Error completing audit: ${error.message}`);
    }
  });
}
"""

if "useCompleteAudit" not in text:
    text += "\n" + new_hook

with open('src/hooks/useAudits.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: useAudits updated.")
