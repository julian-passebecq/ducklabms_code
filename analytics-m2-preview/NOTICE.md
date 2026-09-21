# Analytics M2 UI-only preview

Open index.html with its JS/CSS/vendor folder intact. No backend or cloud login is
needed. Actual SQL/Python/dbt and Spark execution are disabled. Sample rows and imported
results are labelled. Chart aggregation and SCD fixture replay run in the browser.

The preview is built from the supplied M1 + M2 React component source with a recovered
React 18 compatibility runtime. It is not the full pinned React 19/Vite application.
Normal-origin persistence and full runtime qualification remain external QA gates.
See ../QA_STATUS.md and ../THIRD_PARTY_NOTICES.md.

To use a local HTTP origin: from the package root run
python -m http.server 8765 --bind 127.0.0.1
and open http://127.0.0.1:8765/preview/ . No compute API is started.
