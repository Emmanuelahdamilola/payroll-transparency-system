#!/bin/bash

# Soroban Contract Deployment Script
# This script deploys the StaffRegistry contract to Stellar

echo "🚀 Starting Soroban Contract Deployment..."

# Configuration
NETWORK="testnet"
CONTRACT_DIR="./soroban-contracts/staff-registry"
WASM_FILE="target/wasm32-unknown-unknown/release/staff_registry.wasm"

# Check if Soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Soroban CLI not found. Please install it first:"
    echo "cargo install --locked soroban-cli"
    exit 1
fi

# Check if contract directory exists
if [ ! -d "$CONTRACT_DIR" ]; then
    echo "❌ Contract directory not found: $CONTRACT_DIR"
    exit 1
fi

# Navigate to contract directory
cd $CONTRACT_DIR

echo "📦 Building contract..."
soroban contract build

if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not generated. Build failed."
    exit 1
fi

echo "✅ Contract built successfully"

# Deploy contract
echo "🌐 Deploying to $NETWORK..."
CONTRACT_ID=$(soroban contract deploy \
    --wasm $WASM_FILE \
    --network $NETWORK \
    --source-account default)

if [ -z "$CONTRACT_ID" ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Contract deployed successfully!"
echo ""
echo "📝 Contract ID: $CONTRACT_ID"
echo ""
echo "🔧 Add this to your .env file:"
echo "SOROBAN_CONTRACT_ID=$CONTRACT_ID"
echo ""

# Initialize contract
echo "🔐 Initializing contract with owner..."
OWNER_PUBLIC_KEY=$(soroban keys address default)

soroban contract invoke \
    --id $CONTRACT_ID \
    --network $NETWORK \
    --source-account default \
    -- \
    initialize \
    --owner $OWNER_PUBLIC_KEY

echo "✅ Contract initialized with owner: $OWNER_PUBLIC_KEY"
echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Add SOROBAN_CONTRACT_ID to your .env file"
echo "2. Ensure STELLAR_SECRET_KEY matches the deployed account"
echo "3. Start your Node.js server"