# qontext-hw

Measures Qontext's contextuality circuits on a simulator or on IBM Quantum hardware and writes a
`qontext-pool/1` file that Qontext Studio and the theme runtime can draw collapses from.

```
pip install ./python            # local simulators
pip install './python[ibm]'     # adds IBM Quantum support

qontext-hw --noisy              # local run with a noise model
qontext-hw --ibm least_busy     # least busy IBM Quantum device
qontext-hw --ibm ibm_brisbane --shots 1024 --out brisbane.json
qontext-hw --dry-run --ibm least_busy   # transpile only: depth and two-qubit gate counts
qontext-hw --validate brisbane.json     # check a pool and print its scores
qontext-hw --fetch JOB_ID --out run.json # collect a job submitted earlier
```

What runs: six Mermin-Peres contexts (2 data qubits + 3 ancillas each, every observable measured
separately with a Hadamard test) and four CHSH settings on a Bell pair. Ten circuits per job.

Scores: Mermin score (classical max 4, ideal 6) and CHSH value (classical max 2, ideal 2.828).

The job ID is printed as soon as a job is queued, with the exact `--fetch` command to collect it, so closing the
window during a long queue loses nothing. Circuits are placed on qubits chosen by their noise (optimization level 2):
the light level put two-qubit circuits on qubits 0 and 1 unchecked, and on ibm_kingston one of them misreads 17%.
