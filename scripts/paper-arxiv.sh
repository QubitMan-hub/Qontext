#!/usr/bin/env bash
# Packs the paper's source for arXiv: the .tex, its compiled bibliography (.bbl, which arXiv needs because it does not
# run BibTeX) and every figure it uses. Then it compiles the bundle in an empty folder with pdflatex alone, as arXiv
# does, and fails if anything is missing.
#
# Usage, from the repository root:  bash scripts/paper-arxiv.sh   ->  paper/arxiv-source.tar.gz
set -euo pipefail
cd "$(dirname "$0")/../paper"
latexmk -pdf -interaction=nonstopmode -halt-on-error qontext.tex >/dev/null
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/figures"
cp qontext.tex qontext.bbl "$stage/"
cp figures/*.pgf figures/*.png figures/*.jpg "$stage/figures/"
tar -czf arxiv-source.tar.gz -C "$stage" .
check=$(mktemp -d)
trap 'rm -rf "$stage" "$check"' EXIT
tar -xzf arxiv-source.tar.gz -C "$check"
(cd "$check" && for _ in 1 2; do pdflatex -interaction=nonstopmode -halt-on-error qontext.tex >/dev/null; done)
if grep -qE "undefined|^!" "$check/qontext.log"; then
  echo "The bundle does not compile cleanly on its own:" >&2
  grep -E "undefined|^!" "$check/qontext.log" >&2
  exit 1
fi
echo "paper/arxiv-source.tar.gz: $(du -h arxiv-source.tar.gz | cut -f1), compiles on its own to $(pdfinfo "$check/qontext.pdf" | awk '/Pages/ {print $2}') pages"
