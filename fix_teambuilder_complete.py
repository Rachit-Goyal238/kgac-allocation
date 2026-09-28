import sys

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_buttons = """<div className="pt-2 mt-2 border-t flex justify-end">
                      <Button variant="outline" size="sm" onClick={handlePublishAudit} disabled={isNotifying || !team || team.length === 0}>
                        {isNotifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Publish & Notify Team
                      </Button>
                    </div>"""

new_buttons = """<div className="pt-2 mt-2 border-t flex justify-between items-center">
                      {selectedAudit.status === 'scheduled' ? (
                        <Button variant="secondary" className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200" size="sm" onClick={handleCompleteAudit} disabled={completeAudit.isPending}>
                          {completeAudit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          Mark Completed
                        </Button>
                      ) : <div></div>}
                      <Button variant="outline" size="sm" onClick={handlePublishAudit} disabled={isNotifying || !team || team.length === 0 || selectedAudit.status === 'completed'}>
                        {isNotifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {selectedAudit.status === 'completed' ? 'Audit Completed' : 'Publish & Notify Team'}
                      </Button>
                    </div>"""

text = text.replace(old_buttons, new_buttons)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: TeamBuilder updated.")
