// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StaffRegistry
 * @dev Immutable registry for staff identities and payroll batches
 */
contract StaffRegistry {
    // Owner of the contract (admin)
    address public owner;
    
    // Struct to store staff registration info
    struct StaffRecord {
        bytes32 staffHash;
        address registeredBy;
        uint256 registeredAt;
        bool isActive;
    }
    
    // Struct to store payroll batch info
    struct PayrollBatch {
        bytes32 batchHash;
        address uploadedBy;
        uint256 timestamp;
        uint256 staffCount;
    }
    
    // Mappings
    mapping(bytes32 => StaffRecord) public staffRecords;
    mapping(bytes32 => bool) public isStaffRegistered;
    mapping(bytes32 => PayrollBatch) public payrollBatches;
    mapping(bytes32 => bool) public isBatchRecorded;
    
    // Arrays to track all hashes
    bytes32[] public allStaffHashes;
    bytes32[] public allBatchHashes;
    
    // Events
    event StaffRegistered(
        bytes32 indexed staffHash,
        address indexed registeredBy,
        uint256 timestamp
    );
    
    event StaffRevoked(
        bytes32 indexed staffHash,
        address indexed revokedBy,
        uint256 timestamp
    );
    
    event PayrollBatchRecorded(
        bytes32 indexed batchHash,
        address indexed uploadedBy,
        uint256 timestamp,
        uint256 staffCount
    );
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier staffNotRegistered(bytes32 _staffHash) {
        require(!isStaffRegistered[_staffHash], "Staff already registered");
        _;
    }
    
    modifier staffExists(bytes32 _staffHash) {
        require(isStaffRegistered[_staffHash], "Staff not found");
        _;
    }
    
    modifier batchNotRecorded(bytes32 _batchHash) {
        require(!isBatchRecorded[_batchHash], "Batch already recorded");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a new staff member on the blockchain
     * @param _staffHash SHA-256 hash of staff identity
     */
    function registerStaff(bytes32 _staffHash) 
        external 
        onlyOwner 
        staffNotRegistered(_staffHash) 
    {
        require(_staffHash != bytes32(0), "Invalid staff hash");
        
        staffRecords[_staffHash] = StaffRecord({
            staffHash: _staffHash,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        isStaffRegistered[_staffHash] = true;
        allStaffHashes.push(_staffHash);
        
        emit StaffRegistered(_staffHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Revoke a staff member's registration
     * @param _staffHash SHA-256 hash of staff identity
     */
    function revokeStaff(bytes32 _staffHash) 
        external 
        onlyOwner 
        staffExists(_staffHash) 
    {
        staffRecords[_staffHash].isActive = false;
        
        emit StaffRevoked(_staffHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Record a payroll batch on the blockchain
     * @param _batchHash SHA-256 hash of payroll batch
     * @param _staffCount Number of staff in the batch
     */
    function recordPayrollBatch(bytes32 _batchHash, uint256 _staffCount) 
        external 
        onlyOwner 
        batchNotRecorded(_batchHash) 
    {
        require(_batchHash != bytes32(0), "Invalid batch hash");
        require(_staffCount > 0, "Staff count must be greater than 0");
        
        payrollBatches[_batchHash] = PayrollBatch({
            batchHash: _batchHash,
            uploadedBy: msg.sender,
            timestamp: block.timestamp,
            staffCount: _staffCount
        });
        
        isBatchRecorded[_batchHash] = true;
        allBatchHashes.push(_batchHash);
        
        emit PayrollBatchRecorded(_batchHash, msg.sender, block.timestamp, _staffCount);
    }
    
    /**
     * @dev Check if a staff member is registered and active
     * @param _staffHash SHA-256 hash of staff identity
     */
    function isStaffActive(bytes32 _staffHash) external view returns (bool) {
        return isStaffRegistered[_staffHash] && staffRecords[_staffHash].isActive;
    }
    
    /**
     * @dev Get staff record details
     * @param _staffHash SHA-256 hash of staff identity
     */
    function getStaffRecord(bytes32 _staffHash) 
        external 
        view 
        returns (
            bytes32 staffHash,
            address registeredBy,
            uint256 registeredAt,
            bool isActive
        ) 
    {
        require(isStaffRegistered[_staffHash], "Staff not found");
        StaffRecord memory record = staffRecords[_staffHash];
        return (
            record.staffHash,
            record.registeredBy,
            record.registeredAt,
            record.isActive
        );
    }
    
    /**
     * @dev Get payroll batch details
     * @param _batchHash SHA-256 hash of payroll batch
     */
    function getPayrollBatch(bytes32 _batchHash) 
        external 
        view 
        returns (
            bytes32 batchHash,
            address uploadedBy,
            uint256 timestamp,
            uint256 staffCount
        ) 
    {
        require(isBatchRecorded[_batchHash], "Batch not found");
        PayrollBatch memory batch = payrollBatches[_batchHash];
        return (
            batch.batchHash,
            batch.uploadedBy,
            batch.timestamp,
            batch.staffCount
        );
    }
    
    /**
     * @dev Get total number of registered staff
     */
    function getTotalStaff() external view returns (uint256) {
        return allStaffHashes.length;
    }
    
    /**
     * @dev Get total number of recorded batches
     */
    function getTotalBatches() external view returns (uint256) {
        return allBatchHashes.length;
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}