.PHONY: dev up down logs shell clean restart

dev:
	docker-compose -f docker-compose.dev.yml up --build

up:
	docker-compose -f docker-compose.dev.yml up -d

down:
	docker-compose -f docker-compose.dev.yml down

logs:
	docker-compose -f docker-compose.dev.yml logs -f

shell:
	docker-compose -f docker-compose.dev.yml exec gostreamix sh

clean:
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans

restart:
	docker-compose -f docker-compose.dev.yml restart
