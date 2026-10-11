# Security

## Surface

- The Studio and the runtime make no network requests of their own (fonts aside) and store data only in
  the browser's local and session storage.
- Untrusted input: pool files, pasted pool JSON, project codes, images and stored library entries. All of
  them are validated or sanitized before use (`validatePool`, `sanitizeProject`), pool strings are
  HTML-escaped before display, and pool files over 50 MB are refused.
- The Figma plugin declares no network access.
- The hardware runner reads IBM credentials only through `qiskit-ibm-runtime`'s saved account; it never
  stores tokens itself.

## Reporting

Report vulnerabilities privately to the maintainer rather than in a public issue.
