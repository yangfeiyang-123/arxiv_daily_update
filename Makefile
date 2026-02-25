.PHONY: update update-fast serve deploy deploy-worker

update:
	python3 scripts/fetch_cs_ro.py

update-fast:
	python3 scripts/fetch_cs_ro.py --request-interval 1.0 --batch-size 300

serve:
	python3 -m http.server 8000

deploy:
	bash scripts/deploy_one_click.sh

deploy-worker:
	bash scripts/deploy_one_click.sh --with-worker
