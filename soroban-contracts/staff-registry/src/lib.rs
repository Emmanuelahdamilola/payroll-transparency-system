#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec, BytesN, Symbol, symbol_short};

// Staff record - matches Ethereum StaffRecord struct
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StaffRecord {
    pub staff_hash: BytesN<32>,
    pub registered_by: Address,
    pub registered_at: u64,
    pub is_active: bool,
}

// Payroll batch - matches Ethereum PayrollBatch struct
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PayrollBatch {
    pub batch_hash: BytesN<32>,
    pub uploaded_by: Address,
    pub timestamp: u64,
    pub staff_count: u32,
}

// Storage keys
#[contracttype]
pub enum DataKey {
    Owner,
    StaffRecord(BytesN<32>),          // staffRecords mapping
    IsStaffRegistered(BytesN<32>),    // isStaffRegistered mapping
    PayrollBatch(BytesN<32>),         // payrollBatches mapping
    IsBatchRecorded(BytesN<32>),      // isBatchRecorded mapping
    AllStaffHashes,                    // allStaffHashes array
    AllBatchHashes,                    // allBatchHashes array
}

#[contract]
pub struct StaffRegistry;

#[contractimpl]
impl StaffRegistry {
    /// Initialize contract - similar to Solidity constructor
    pub fn initialize(env: Env, owner: Address) {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Owner) {
            panic!("Already initialized");
        }
        
        // Require auth from owner
        owner.require_auth();
        
        // Set owner
        env.storage().instance().set(&DataKey::Owner, &owner);
        
        // Initialize empty arrays
        let empty_staff: Vec<BytesN<32>> = Vec::new(&env);
        let empty_batches: Vec<BytesN<32>> = Vec::new(&env);
        
        env.storage().persistent().set(&DataKey::AllStaffHashes, &empty_staff);
        env.storage().persistent().set(&DataKey::AllBatchHashes, &empty_batches);
    }

    /// Get owner (like public owner variable in Solidity)
    pub fn owner(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Owner)
            .unwrap_or_else(|| panic!("Not initialized"))
    }

    /// Register staff - matches registerStaff function
    pub fn register_staff(env: Env, staff_hash: BytesN<32>) {
        // onlyOwner modifier
        let owner = Self::owner(env.clone());
        owner.require_auth();

        // staffNotRegistered modifier
        let is_registered_key = DataKey::IsStaffRegistered(staff_hash.clone());
        if env.storage().persistent().get::<DataKey, bool>(&is_registered_key).unwrap_or(false) {
            panic!("Staff already registered");
        }

        // require(_staffHash != bytes32(0))
        let zero_hash = BytesN::from_array(&env, &[0u8; 32]);
        if staff_hash == zero_hash {
            panic!("Invalid staff hash");
        }

        // Create staff record
        let record = StaffRecord {
            staff_hash: staff_hash.clone(),
            registered_by: owner.clone(),
            registered_at: env.ledger().timestamp(),
            is_active: true,
        };

        // Store record in staffRecords mapping
        env.storage()
            .persistent()
            .set(&DataKey::StaffRecord(staff_hash.clone()), &record);

        // Set isStaffRegistered[_staffHash] = true
        env.storage()
            .persistent()
            .set(&is_registered_key, &true);

        // Add to allStaffHashes array
        let mut all_staff: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::AllStaffHashes)
            .unwrap_or(Vec::new(&env));
        all_staff.push_back(staff_hash.clone());
        env.storage().persistent().set(&DataKey::AllStaffHashes, &all_staff);

        // Emit event
        env.events().publish(
            (symbol_short!("staff_reg"), staff_hash.clone()),
            (owner, env.ledger().timestamp())
        );
    }

    /// Revoke staff - matches revokeStaff function
    pub fn revoke_staff(env: Env, staff_hash: BytesN<32>) {
        // onlyOwner
        let owner = Self::owner(env.clone());
        owner.require_auth();

        // staffExists
        let is_registered_key = DataKey::IsStaffRegistered(staff_hash.clone());
        if !env.storage().persistent().get::<DataKey, bool>(&is_registered_key).unwrap_or(false) {
            panic!("Staff not found");
        }

        // Get and update record
        let mut record: StaffRecord = env
            .storage()
            .persistent()
            .get(&DataKey::StaffRecord(staff_hash.clone()))
            .unwrap();
        
        record.is_active = false;
        
        env.storage()
            .persistent()
            .set(&DataKey::StaffRecord(staff_hash.clone()), &record);

        // Emit event
        env.events().publish(
            (symbol_short!("staff_rev"), staff_hash.clone()),
            (owner, env.ledger().timestamp())
        );
    }

    /// Record payroll batch - matches recordPayrollBatch function
    pub fn record_payroll_batch(env: Env, batch_hash: BytesN<32>, staff_count: u32) {
        // onlyOwner
        let owner = Self::owner(env.clone());
        owner.require_auth();

        // batchNotRecorded
        let is_recorded_key = DataKey::IsBatchRecorded(batch_hash.clone());
        if env.storage().persistent().get::<DataKey, bool>(&is_recorded_key).unwrap_or(false) {
            panic!("Batch already recorded");
        }

        // require(_batchHash != bytes32(0))
        let zero_hash = BytesN::from_array(&env, &[0u8; 32]);
        if batch_hash == zero_hash {
            panic!("Invalid batch hash");
        }

        // require(_staffCount > 0)
        if staff_count == 0 {
            panic!("Staff count must be greater than 0");
        }

        // Create batch record
        let batch = PayrollBatch {
            batch_hash: batch_hash.clone(),
            uploaded_by: owner.clone(),
            timestamp: env.ledger().timestamp(),
            staff_count,
        };

        // Store in payrollBatches mapping
        env.storage()
            .persistent()
            .set(&DataKey::PayrollBatch(batch_hash.clone()), &batch);

        // Set isBatchRecorded[_batchHash] = true
        env.storage()
            .persistent()
            .set(&is_recorded_key, &true);

        // Add to allBatchHashes array
        let mut all_batches: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::AllBatchHashes)
            .unwrap_or(Vec::new(&env));
        all_batches.push_back(batch_hash.clone());
        env.storage().persistent().set(&DataKey::AllBatchHashes, &all_batches);

        // Emit event
        env.events().publish(
            (symbol_short!("batch_rec"), batch_hash.clone()),
            (owner, env.ledger().timestamp(), staff_count)
        );
    }

    /// Check if staff is active - matches isStaffActive view function
    pub fn is_staff_active(env: Env, staff_hash: BytesN<32>) -> bool {
        let is_registered_key = DataKey::IsStaffRegistered(staff_hash.clone());
        let is_registered = env.storage()
            .persistent()
            .get::<DataKey, bool>(&is_registered_key)
            .unwrap_or(false);

        if !is_registered {
            return false;
        }

        let record: StaffRecord = env
            .storage()
            .persistent()
            .get(&DataKey::StaffRecord(staff_hash))
            .unwrap();

        record.is_active
    }

    /// Get staff record - matches getStaffRecord view function
    pub fn get_staff_record(env: Env, staff_hash: BytesN<32>) -> StaffRecord {
        let is_registered_key = DataKey::IsStaffRegistered(staff_hash.clone());
        if !env.storage().persistent().get::<DataKey, bool>(&is_registered_key).unwrap_or(false) {
            panic!("Staff not found");
        }

        env.storage()
            .persistent()
            .get(&DataKey::StaffRecord(staff_hash))
            .unwrap()
    }

    /// Get payroll batch - matches getPayrollBatch view function
    pub fn get_payroll_batch(env: Env, batch_hash: BytesN<32>) -> PayrollBatch {
        let is_recorded_key = DataKey::IsBatchRecorded(batch_hash.clone());
        if !env.storage().persistent().get::<DataKey, bool>(&is_recorded_key).unwrap_or(false) {
            panic!("Batch not found");
        }

        env.storage()
            .persistent()
            .get(&DataKey::PayrollBatch(batch_hash))
            .unwrap()
    }

    /// Check if staff is registered - matches isStaffRegistered mapping
    pub fn is_staff_registered(env: Env, staff_hash: BytesN<32>) -> bool {
        let key = DataKey::IsStaffRegistered(staff_hash);
        env.storage().persistent().get(&key).unwrap_or(false)
    }

    /// Check if batch is recorded - matches isBatchRecorded mapping
    pub fn is_batch_recorded(env: Env, batch_hash: BytesN<32>) -> bool {
        let key = DataKey::IsBatchRecorded(batch_hash);
        env.storage().persistent().get(&key).unwrap_or(false)
    }

    /// Get total staff - matches getTotalStaff view function
    pub fn get_total_staff(env: Env) -> u32 {
        let all_staff: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::AllStaffHashes)
            .unwrap_or(Vec::new(&env));
        
        all_staff.len()
    }

    /// Get total batches - matches getTotalBatches view function
    pub fn get_total_batches(env: Env) -> u32 {
        let all_batches: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::AllBatchHashes)
            .unwrap_or(Vec::new(&env));
        
        all_batches.len()
    }

    /// Transfer ownership - matches transferOwnership function
    pub fn transfer_ownership(env: Env, new_owner: Address) {
        let owner = Self::owner(env.clone());
        owner.require_auth();
        
        // require(newOwner != address(0))
        new_owner.require_auth();
        
        env.storage().instance().set(&DataKey::Owner, &new_owner);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_initialize_and_register() {
        let env = Env::default();
        env.mock_all_auths();
        
        let contract_id = env.register_contract(None, StaffRegistry);
        let client = StaffRegistryClient::new(&env, &contract_id);
        
        let owner = Address::generate(&env);
        
        // Initialize
        client.initialize(&owner);
        assert_eq!(client.owner(), owner);
        
        // Register staff
        let staff_hash = BytesN::from_array(&env, &[1u8; 32]);
        client.register_staff(&staff_hash);
        
        // Verify
        assert!(client.is_staff_registered(&staff_hash));
        assert!(client.is_staff_active(&staff_hash));
        assert_eq!(client.get_total_staff(), 1);
    }

    #[test]
    fn test_payroll_batch() {
        let env = Env::default();
        env.mock_all_auths();
        
        let contract_id = env.register_contract(None, StaffRegistry);
        let client = StaffRegistryClient::new(&env, &contract_id);
        
        let owner = Address::generate(&env);
        client.initialize(&owner);
        
        let batch_hash = BytesN::from_array(&env, &[2u8; 32]);
        client.record_payroll_batch(&batch_hash, &10);
        
        assert!(client.is_batch_recorded(&batch_hash));
        assert_eq!(client.get_total_batches(), 1);
    }
}