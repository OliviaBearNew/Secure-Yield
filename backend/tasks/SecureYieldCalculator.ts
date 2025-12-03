import { task } from "hardhat/config";

export default task("calculate", "Calculate yield for a demo principal/time")
  .addParam("principal", "Principal amount (number)")
  .addParam("time", "Time/integer duration")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();

    const deployments = await hre.deployments.all();
    const dep = deployments["SecureYieldCalculator"];
    if (!dep) throw new Error("SecureYieldCalculator is not deployed");

    const contract = await hre.ethers.getContractAt(
      dep.abi,
      dep.address,
      signer
    );

    // Use FHEVM external API from plugin when running against hardhat node
    const input = await hre.fhevm.createEncryptedInput(dep.address, signer.address);
    input.add64(BigInt(args.principal));
    input.add32(Number(args.time));
    const enc = await input.encrypt();

    const tx = await contract.calculate(enc.handles[0], enc.handles[1], enc.inputProof);
    await tx.wait();

    console.log("calculate() sent:", tx.hash);
  });

