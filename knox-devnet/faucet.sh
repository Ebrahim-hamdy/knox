#!/bin/bash
set -e

MINER_CONTAINER="nockchain-miner"
MINER_PKH="9yPePjfWAdUnzaQKyxcRXKRa5PpUzKKEwtpECBZsUYt9Jd7egSDEWoV"
SEED="farm step rhythm surprise math august panther pulse protect remain anger depend adjust sting enable poet describe stone essay blast click horse hair practice"
WALLET_FLAGS="--client private"
COINBASE_MATURITY_BLOCKS=105


get_block_height() {
  local height
  height=$(docker logs "$MINER_CONTAINER" 2>&1 | \
    grep -Eo "added to validated blocks at [0-9]+" | \
    grep -Eo '[0-9]+' | sort -rn | head -n1)
  
  echo "${height:-0}"
}

get_first_spendable_note() {
    docker exec -u nockchain "$MINER_CONTAINER" nockchain-wallet $WALLET_FLAGS list-notes 2>/dev/null | \
    sed 's/\x1b\[[0-9;]*m//g' | \
    grep -o '\[[a-z]\+ [a-z]\+\]' | \
    head -n 1 | \
    tr -d '[]'
}

get_spendable_balance() {
    local balance_output
    balance_output=$(docker exec -u nockchain "$MINER_CONTAINER" nockchain-wallet $WALLET_FLAGS show-balance 2>&1)
    
    local balance
    balance=$(echo "$balance_output" | grep "Balance:" | grep -Eo '[0-9]+')
    
    echo "${balance:-0}"
}

if [ -z "$1" ]; then
  echo "❌ Usage: ./fund_wallet.sh <YOUR_WALLET_ADDRESS_PKH>"
  exit 1
fi

RECIPIENT_PKH=$1
AMOUNT_NOCK=${2:-100}
AMOUNT_NICKS=$(echo "$AMOUNT_NOCK * 65536" | bc)
AMOUNT_NICKS=${AMOUNT_NICKS%.*}

echo "✅ === Nockchain Local Faucet === ✅"

if ! docker ps --format '{{.Names}}' | grep -q "^${MINER_CONTAINER}$"; then
    echo "❌ Error: The container '${MINER_CONTAINER}' is not running. Please start it with 'docker-compose up -d'."
    exit 1
fi

echo "--> Waiting for chain to reach maturity (${COINBASE_MATURITY_BLOCKS} blocks)..."
while true; do
    height=$(get_block_height)
    if [ "$height" -ge "$COINBASE_MATURITY_BLOCKS" ]; then
        printf "\n--> Chain is mature (Height: %s). Mined rewards should now be spendable.\n" "$height"
        break
    fi
    printf "    Current block height: %s. Waiting... \r" "$height"
    sleep 5
done

echo "--> Forcing wallet to re-import keys and re-scan the blockchain..."
docker exec -u nockchain "$MINER_CONTAINER" nockchain-wallet $WALLET_FLAGS import-keys --seedphrase "$SEED" --version 1 >/dev/null
docker exec -u nockchain "$MINER_CONTAINER" nockchain-wallet $WALLET_FLAGS set-active-master-address "$MINER_PKH" >/dev/null


echo "--> Wallet is scanning. Polling for a spendable coin to become visible..."
NOTE_NAME=""
for i in {1..60}; do
    balance=$(get_spendable_balance)
    NOTE_NAME=$(get_first_spendable_note)
    
    if [ -n "$NOTE_NAME" ]; then
        printf "\n--> Found spendable balance: %s nicks.\n" "$balance"
        break 
    fi

    printf "    Attempt %s/60: Balance: %s nicks. Waiting for spendable coin... \r" "$i" "$balance"
    sleep 3
done

if [ -z "$NOTE_NAME" ]; then
    echo "❌ FATAL: Timed out waiting for a spendable note to appear. Please try restarting and running the script again." >&2
    exit 1
fi

echo "--> Found coin: ${NOTE_NAME}. Preparing transaction to: ${RECIPIENT_PKH}"
RECIPIENT_JSON="{\"kind\":\"p2pkh\",\"address\":\"$RECIPIENT_PKH\",\"amount\":$AMOUNT_NICKS}"

docker exec -u nockchain "$MINER_CONTAINER" nockchain-wallet $WALLET_FLAGS create-tx \
  --names "$NOTE_NAME" \
  --recipient "$RECIPIENT_JSON" \
  --fee 1000 \
  --refund-pkh "$MINER_PKH" >/dev/null

TX_FILE=$(docker exec -u nockchain "$MINER_CONTAINER" ls -t /data | grep "\.jam$" | head -n 1)
echo "--> Broadcasting transaction file: ${TX_FILE}"
docker exec -u nockchain "$MINER_CONTAINER" nockchain-wallet $WALLET_FLAGS send-tx "/data/${TX_FILE}"

echo ""
echo "🎉 Success! Funds sent. Your wallet balance will update shortly."