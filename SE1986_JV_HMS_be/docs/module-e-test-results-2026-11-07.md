# Module E verification — 07/11/2026

Code under test: `2843fe0` on DucHM, pushed before testing.

## Automated verification

- `Test-ModuleEFeedbackSql.ps1 -Offline -IncludeUnitTests`: 119 passed, no failures/errors/skips. The wildcard also selects other modules' service tests; this is not 119 Module E tests. Module E contributes 80 service/JWT cases and 5 SQL feedback cases.
- SQL feedback cases use real controllers, services, JWT verification and JDBC; principal lookup is stubbed. Fixtures roll back.
- Live E2E tests below use real password login and database principal lookup instead.
- Frontend full lint and production build passed. Build retains the warning about a JavaScript chunk over 500 kB.

## Runtime and browser verification

Dedicated database: `HotelManagement_E2E_20261107_module_e_test`, initialized from current schema and demo seed. Backend listens on 127.0.0.1:18080; test frontend uses localhost:5173. No business data in HotelManagement_SBA was changed.

- Real Manager, Staff and Customer password login succeeded.
- Browser: Manager creates task #5, assigned Housekeeper sees it, starts and completes it. SQL confirms COMPLETED and both timestamps.
- Browser: Staff creates issue #4; blank submission displays field validation. Manager assigns Housekeeper; Housekeeper starts and resolves it with a Unicode note. SQL confirms RESOLVED, note and resolved_at.
- Browser: Customer selects a dedicated CHECKED_OUT fixture booking BK-E2E-FEEDBACK, submits feedback #2; Manager replies; Customer signs in again and sees the reply. The submitted booking disappears from eligible choices and submit is disabled when none remain. SQL confirms rating, replied_by=2 and replied_at.
- Dashboard renders total=5, pending=2, inProgress=0, completed=3, cancelled=0 and progress=60%, consistent with the tested state.
- Live API: anonymous issues=401; Staff dashboard=403; Customer tasks=403; duplicate feedback=409; second reply=409.
- `Test-ModuleE.ps1 -WriteDemoData` completes task/issue lifecycles and dashboard reconciliation after the script fix described below.
- Browser exercised all six Operations pages at its default narrow viewport. This does not constitute exhaustive testing of every breakpoint, filter combination, account configuration or concurrent request.

## Findings and limits

1. Fixed locally: the smoke-test script kept Staff headers after resolving an issue and used them to read the Manager dashboard. Restore Manager headers before the final dashboard read. The previous 403 was correct application behavior. Rerun passed.
2. Current CORS defaults allow localhost:5173, not 127.0.0.1:5173. Browser login on the latter returned Network Error; localhost works. This is a shared application configuration finding.
3. After switching roles, login may return to the previous role's page and show 403. Direct navigation to the permitted Operations page works. Shared authentication redirect behavior needs review by its owner.
4. Dashboard issue summaries display raw status codes (e.g. OPEN/ASSIGNED), unlike the Vietnamese labels on the issue board.
5. E2E booking was prepared directly in the isolated test database. This verifies Module E after checkout, not the Booking/Front Desk checkout workflow.
6. Initial attempt to seed the older rollback-test database failed because the stock seed assumes identities start at 1. Transaction rolled back; E2E testing moved to the new database above. No fixture rows were retained in the rollback-test database.

Runtime demo records are retained in the dedicated E2E database for inspection. Test connection secrets and temporary logs/scripts remain under ignored target/. No changes to other members' source modules were made.
