import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: Type assertion for alloc.user
text = text.replace('a.user?.zone?.toLowerCase()', '(a.user as any)?.zone?.toLowerCase()')
text = text.replace('alloc.user.agreed_rate', '(alloc.user as any).agreed_rate')
text = text.replace('alloc.user.monthly_salary', '(alloc.user as any).monthly_salary')

# Fix 2: ExportButton for Audits
old_export_1 = """<ExportButton 
                            data={marginData || []} 
                            columns={[
                                { header: 'Audit Name', key: 'name' },
                                { header: 'Date', key: 'audit_date' },
                                { header: 'Days', key: 'audit_days' },
                                { header: 'Status', key: 'status' },
                                { header: 'Client', key: 'client.name' },
                                { header: 'Project', key: 'project.name' },
                                { header: 'Total Expense', key: 'metrics.totalTeamCost' },
                                { header: 'Agreed Revenue', key: 'metrics.revenue' },
                                { header: 'Margin', key: 'metrics.margin' }
                            ]}
                            filename={`audit_margins_${format(new Date(), 'yyyy-MM-dd')}`}
                        />"""

new_export_1 = """<ExportButton 
                            onExport={async (exportFormat) => {
                                if (!marginData || marginData.length === 0) return;
                                const exportRows = marginData.map(d => ({
                                    'Audit Name': d.name,
                                    'Date': d.audit_date,
                                    'Days': d.audit_days,
                                    'Status': d.status,
                                    'Client': d.client?.name || '',
                                    'Project': d.project?.name || '',
                                    'Total Expense': d.metrics.totalTeamCost,
                                    'Agreed Revenue': d.metrics.revenue,
                                    'Margin': d.metrics.margin
                                }));
                                if (exportFormat === 'csv') exportToCSV(exportRows, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}`);
                                else exportToExcel(exportRows, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}`);
                            }}
                        />"""
                        
text = text.replace(old_export_1, new_export_1)

# Fix 3: ExportButton for Projects
old_export_2 = """<ExportButton 
                            data={projectBilling || []} 
                            columns={[
                                { header: 'Project Name', key: 'name' },
                                { header: 'Project Code', key: 'code' },
                                { header: 'Is Billable', key: 'is_billable' },
                                { header: 'Total Man Days', key: 'totalManDays' },
                                { header: 'Total Internal Cost', key: 'totalCost' }
                            ]}
                            filename={`manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}`}
                        />"""

new_export_2 = """<ExportButton 
                            onExport={async (exportFormat) => {
                                if (!projectBilling || projectBilling.length === 0) return;
                                const exportRows = projectBilling.map(d => ({
                                    'Project Name': d.name,
                                    'Project Code': d.code,
                                    'Is Billable': d.is_billable ? 'Yes' : 'No',
                                    'Total Man Days': d.totalManDays,
                                    'Total Internal Cost': d.totalCost
                                }));
                                if (exportFormat === 'csv') exportToCSV(exportRows, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}`);
                                else exportToExcel(exportRows, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}`);
                            }}
                        />"""

text = text.replace(old_export_2, new_export_2)

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: Updated ReconciliationPage exports and types.")

