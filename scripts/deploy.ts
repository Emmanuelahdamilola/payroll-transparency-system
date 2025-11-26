import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying StaffRegistry contract...");

  // Get the contract factory
  const StaffRegistry = await hre.ethers.getContractFactory("StaffRegistry");
  
  // Deploy the contract
  const staffRegistry = await StaffRegistry.deploy();
  
  // Wait for deployment to finish
  await staffRegistry.waitForDeployment();
  
  const address = await staffRegistry.getAddress();
  
  console.log("✅ StaffRegistry deployed successfully!");
  console.log(`📍 Contract address: ${address}`);
  console.log(`👤 Deployed by: ${await staffRegistry.owner()}`);
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: address,
    deployer: await staffRegistry.owner(),
    network: "localhost",
    timestamp: new Date().toISOString()
  };
  
  console.log("\n📝 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💡 Add this to your .env file:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });