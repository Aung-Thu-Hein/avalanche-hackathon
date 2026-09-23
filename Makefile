-include .env
export

.PHONY: build test fmt deploy web install

install:
	forge install foundry-rs/forge-std
	cd web && npm install

build:
	forge build

test:
	forge test -vv

fmt:
	forge fmt

deploy:
	forge script script/Deploy.s.sol --rpc-url fuji --broadcast

web:
	cd web && npm run dev
