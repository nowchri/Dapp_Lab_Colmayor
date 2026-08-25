import { expect } from "chai";
import { ethers } from "hardhat";

describe("LaboratoryAssetRegistry", function () {
  let contract: any;
  let professor: any;
  let monitor: any;
  let other: any;

  const ASSET_HASH = ethers.keccak256(ethers.toUtf8Bytes("asset-001"));
  const LOAN_HASH = ethers.keccak256(ethers.toUtf8Bytes("loan-bolsa-001"));
  const STUDENT_HASH = ethers.keccak256(ethers.toUtf8Bytes("student-001"));

  beforeEach(async function () {
    [professor, monitor, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("LaboratoryAssetRegistry");
    contract = await Factory.deploy(monitor.address);
    await contract.waitForDeployment();
  });

  describe("constructor", function () {
    it("asigna professor como deployer", async function () {
      expect(await contract.professor()).to.equal(professor.address);
    });

    it("habilita el monitor inicial", async function () {
      expect(await contract.monitors(monitor.address)).to.equal(true);
    });
  });

  describe("setMonitor", function () {
    it("professor puede habilitar monitor", async function () {
      await contract.connect(professor).setMonitor(other.address, true);
      expect(await contract.monitors(other.address)).to.equal(true);
    });

    it("professor puede deshabilitar monitor", async function () {
      await contract.connect(professor).setMonitor(monitor.address, false);
      expect(await contract.monitors(monitor.address)).to.equal(false);
    });

    it("no-professor no puede modificar monitores", async function () {
      await expect(
        contract.connect(other).setMonitor(other.address, true)
      ).to.be.revertedWithCustomError(contract, "OnlyProfessor");
    });
  });

  describe("registerLoan", function () {
    it("monitor registra prestamo por activo", async function () {
      await contract.connect(monitor).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
      expect(await contract.assetLoaned(ASSET_HASH)).to.equal(true);
      expect(await contract.totalLoans()).to.equal(1);
    });

    it("rechaza activo ya prestado", async function () {
      await contract.connect(monitor).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
      await expect(
        contract.connect(monitor).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "AssetAlreadyLoaned");
    });

    it("solo monitor puede registrar prestamo", async function () {
      await expect(
        contract.connect(other).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "OnlyMonitor");
    });
  });

  describe("registerReturn", function () {
    beforeEach(async function () {
      await contract.connect(monitor).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
    });

    it("monitor registra devolucion exitosamente", async function () {
      await contract.connect(monitor).registerReturn(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
      expect(await contract.assetLoaned(ASSET_HASH)).to.equal(false);
      expect(await contract.totalReturns()).to.equal(1);
    });

    it("rechaza activo ya devuelto", async function () {
      await contract.connect(monitor).registerReturn(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
      await expect(
        contract.connect(monitor).registerReturn(LOAN_HASH, ASSET_HASH, STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "AssetNotLoaned");
    });

    it("rechaza activo nunca prestado", async function () {
      const NEW = ethers.keccak256(ethers.toUtf8Bytes("asset-nuevo"));
      await expect(
        contract.connect(monitor).registerReturn(LOAN_HASH, NEW, STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "AssetNotLoaned");
    });

    it("rechaza si no es monitor", async function () {
      await expect(
        contract.connect(other).registerReturn(LOAN_HASH, ASSET_HASH, STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "OnlyMonitor");
    });
  });

  describe("registerLoanBatch", function () {
    const ASSET2 = ethers.keccak256(ethers.toUtf8Bytes("asset-002"));
    const ASSET3 = ethers.keccak256(ethers.toUtf8Bytes("asset-003"));

    it("registra todos los activos de la bolsa en una tx", async function () {
      await contract.connect(monitor).registerLoanBatch(
        LOAN_HASH, [ASSET_HASH, ASSET2, ASSET3], STUDENT_HASH
      );
      expect(await contract.assetLoaned(ASSET_HASH)).to.equal(true);
      expect(await contract.assetLoaned(ASSET2)).to.equal(true);
      expect(await contract.assetLoaned(ASSET3)).to.equal(true);
      expect(await contract.totalLoans()).to.equal(3);
    });

    it("cada activo tiene su propio historial (trazabilidad individual)", async function () {
      await contract.connect(monitor).registerLoanBatch(
        LOAN_HASH, [ASSET_HASH, ASSET2], STUDENT_HASH
      );
      expect((await contract.getAssetHistory(ASSET_HASH)).length).to.equal(1);
      expect((await contract.getAssetHistory(ASSET2)).length).to.equal(1);
      expect((await contract.getAssetHistory(ASSET3)).length).to.equal(0);
      const mov = await contract.getMovement(0);
      expect(mov.assetHash).to.equal(ASSET_HASH);
      const mov2 = await contract.getMovement(1);
      expect(mov2.assetHash).to.equal(ASSET2);
    });

    it("emite un evento LoanRegistered por activo", async function () {
      const tx = await contract.connect(monitor).registerLoanBatch(
        LOAN_HASH, [ASSET_HASH, ASSET2], STUDENT_HASH
      );
      const receipt = await tx.wait();
      const events = receipt.logs.filter((l: any) => l.fragment?.name === "LoanRegistered");
      expect(events.length).to.equal(2);
    });

    it("revierte si un activo ya está prestado (atomicidad)", async function () {
      await contract.connect(monitor).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
      await expect(
        contract.connect(monitor).registerLoanBatch(LOAN_HASH, [ASSET2, ASSET_HASH], STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "AssetAlreadyLoaned");
      // Nada del batch se registró
      expect(await contract.assetLoaned(ASSET2)).to.equal(false);
      expect(await contract.totalLoans()).to.equal(1);
    });

    it("solo monitor puede registrar batch", async function () {
      await expect(
        contract.connect(other).registerLoanBatch(LOAN_HASH, [ASSET_HASH], STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "OnlyMonitor");
    });
  });

  describe("registerReturnBatch", function () {
    const ASSET2 = ethers.keccak256(ethers.toUtf8Bytes("asset-002"));

    beforeEach(async function () {
      await contract.connect(monitor).registerLoanBatch(
        LOAN_HASH, [ASSET_HASH, ASSET2], STUDENT_HASH
      );
    });

    it("devuelve todos los activos en una tx", async function () {
      await contract.connect(monitor).registerReturnBatch(
        LOAN_HASH, [ASSET_HASH, ASSET2], STUDENT_HASH
      );
      expect(await contract.assetLoaned(ASSET_HASH)).to.equal(false);
      expect(await contract.assetLoaned(ASSET2)).to.equal(false);
      expect(await contract.totalReturns()).to.equal(2);
    });

    it("historial queda con loan + return por activo", async function () {
      await contract.connect(monitor).registerReturnBatch(
        LOAN_HASH, [ASSET_HASH, ASSET2], STUDENT_HASH
      );
      expect((await contract.getAssetHistory(ASSET_HASH)).length).to.equal(2);
      expect((await contract.getAssetHistory(ASSET2)).length).to.equal(2);
    });

    it("revierte si un activo no estaba prestado", async function () {
      const NUEVO = ethers.keccak256(ethers.toUtf8Bytes("asset-nuevo"));
      await expect(
        contract.connect(monitor).registerReturnBatch(LOAN_HASH, [ASSET_HASH, NUEVO], STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "AssetNotLoaned");
      expect(await contract.totalReturns()).to.equal(0);
    });

    it("solo monitor puede registrar devolución batch", async function () {
      await expect(
        contract.connect(other).registerReturnBatch(LOAN_HASH, [ASSET_HASH], STUDENT_HASH)
      ).to.be.revertedWithCustomError(contract, "OnlyMonitor");
    });
  });

  describe("getAssetHistory", function () {
    it("retorna historial de movimientos del activo", async function () {
      await contract.connect(monitor).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
      await contract.connect(monitor).registerReturn(LOAN_HASH, ASSET_HASH, STUDENT_HASH);

      const history = await contract.getAssetHistory(ASSET_HASH);
      expect(history.length).to.equal(2);
    });

    it("retorna array vacio sin historial", async function () {
      const N = ethers.keccak256(ethers.toUtf8Bytes("sin-historial"));
      const h = await contract.getAssetHistory(N);
      expect(h.length).to.equal(0);
    });
  });

  describe("getMovement", function () {
    it("retorna movimiento correcto por indice", async function () {
      await contract.connect(monitor).registerLoan(LOAN_HASH, ASSET_HASH, STUDENT_HASH);
      const mov = await contract.getMovement(0);
      expect(mov.loanHash).to.equal(LOAN_HASH);
      expect(mov.assetHash).to.equal(ASSET_HASH);
      expect(mov.studentHash).to.equal(STUDENT_HASH);
      expect(mov.monitor).to.equal(monitor.address);
      expect(mov.movementType).to.equal(0); // 0 = Loan
    });
  });
});