.PHONY: install prebuild build serve clean

install: ## Install dependencies
	npm ci

prebuild: ## Generate static data files
	npx tsx scripts/prebuild.ts

build: prebuild ## Build static site (prebuild + next build)
	npx next build

serve: build ## Build and serve locally for testing
	npx serve out

clean: ## Remove generated artifacts
	rm -rf out public/data public/resume.pdf .next
