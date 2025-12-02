// import Staff from '../models/Staff';
// import Flag, { IFlag } from '../models/Flag';
// import { FlagType } from '../types';
// import { compareTwoStrings } from 'string-similarity';
// import { decrypt } from '../utils/encryption';

// // Grade salary ranges (Nigerian civil service structure)
// const SALARY_RANGES: Record<string, { min: number; max: number }> = {
//   'Grade Level 1': { min: 30000, max: 50000 },
//   'Grade Level 2': { min: 40000, max: 60000 },
//   'Grade Level 3': { min: 50000, max: 70000 },
//   'Grade Level 4': { min: 60000, max: 80000 },
//   'Grade Level 5': { min: 70000, max: 100000 },
//   'Grade Level 6': { min: 90000, max: 130000 },
//   'Grade Level 7': { min: 120000, max: 170000 },
//   'Grade Level 8': { min: 150000, max: 220000 },
//   'Grade Level 9': { min: 200000, max: 280000 },
//   'Grade Level 10': { min: 250000, max: 350000 },
//   'Grade Level 11': { min: 300000, max: 420000 },
//   'Grade Level 12': { min: 350000, max: 500000 },
//   'Grade Level 13': { min: 400000, max: 600000 },
//   'Grade Level 14': { min: 500000, max: 750000 },
//   'Grade Level 15': { min: 600000, max: 900000 },
//   'Grade Level 16': { min: 700000, max: 1100000 },
//   'Grade Level 17': { min: 800000, max: 1300000 },
// };

// interface PayrollRecord {
//   staffHash: string;
//   salary: number;
//   status: string;
//   flags: any[];
// }

// interface DetectionResult {
//   flags: IFlag[];
//   summary: {
//     totalRecords: number;
//     ghostWorkers: number;
//     duplicates: number;
//     salaryAnomalies: number;
//     totalFlags: number;
//   };
// }

// /**
//  * Main AI detection function - runs all checks
//  */
// export const runAIDetection = async (
//   payrollId: string,
//   payrollRecords: PayrollRecord[]
// ): Promise<DetectionResult> => {
//   console.log(`🤖 Running AI detection on ${payrollRecords.length} records...`);

//   const allFlags: IFlag[] = [];

//   // 1. Ghost Worker Detection
//   const ghostFlags = await detectGhostWorkers(payrollId, payrollRecords);
//   allFlags.push(...ghostFlags);

//   // 2. Duplicate Detection (BVN/NIN)
//   const duplicateFlags = await detectDuplicates(payrollId, payrollRecords);
//   allFlags.push(...duplicateFlags);

//   // 3. Fuzzy Name Matching
//   const fuzzyFlags = await detectFuzzyDuplicates(payrollId, payrollRecords);
//   allFlags.push(...fuzzyFlags);

//   // 4. Salary Anomaly Detection
//   const salaryFlags = await detectSalaryAnomalies(payrollId, payrollRecords);
//   allFlags.push(...salaryFlags);

//   const summary = {
//     totalRecords: payrollRecords.length,
//     ghostWorkers: ghostFlags.length,
//     duplicates: duplicateFlags.length,
//     salaryAnomalies: salaryFlags.length,
//     totalFlags: allFlags.length,
//   };

//   console.log(`✅ Detection complete: ${allFlags.length} flags created`);
//   console.log(`   - Ghost workers: ${ghostFlags.length}`);
//   console.log(`   - Duplicates: ${duplicateFlags.length}`);
//   console.log(`   - Salary anomalies: ${salaryFlags.length}`);

//   return { flags: allFlags, summary };
// };

// /**
//  * 1. Ghost Worker Detection - Staff not in registry
//  */
// async function detectGhostWorkers(
//   payrollId: string,
//   records: PayrollRecord[]
// ): Promise<IFlag[]> {
//   const flags: IFlag[] = [];

//   for (const record of records) {
//     const staff = await Staff.findOne({ staffHash: record.staffHash });

//     if (!staff) {
//       const flag = await Flag.create({
//         payrollId,
//         staffHash: record.staffHash,
//         type: FlagType.GHOST,
//         score: 1.0, // 100% confidence - staff doesn't exist
//         explanation: generateExplanation(FlagType.GHOST, {
//           staffHash: record.staffHash,
//           salary: record.salary,
//         }),
//         metadata: {
//           salary: record.salary,
//           reason: 'Staff hash not found in registry',
//         },
//         reviewed: false,
//         resolution: 'pending',
//       });

//       flags.push(flag);
//     } else if (!staff.verified) {
//       // Staff exists but not verified on blockchain
//       const flag = await Flag.create({
//         payrollId,
//         staffHash: record.staffHash,
//         type: FlagType.MISSING_REGISTRY,
//         score: 0.9, // 90% confidence - exists but unverified
//         explanation: generateExplanation(FlagType.MISSING_REGISTRY, {
//           staffHash: record.staffHash,
//           verified: staff.verified,
//           blockchainTxs: staff.blockchainTxs.length,
//         }),
//         metadata: {
//           salary: record.salary,
//           grade: staff.grade,
//           department: staff.department,
//           blockchainTxs: staff.blockchainTxs,
//         },
//         reviewed: false,
//         resolution: 'pending',
//       });

//       flags.push(flag);
//     }
//   }

//   return flags;
// }

// /**
//  * 2. Duplicate Detection - Exact BVN/NIN matches
//  */
// async function detectDuplicates(
//   payrollId: string,
//   records: PayrollRecord[]
// ): Promise<IFlag[]> {
//   const flags: IFlag[] = [];
//   const staffHashes = records.map((r) => r.staffHash);

//   // Get all staff for these hashes
//   const allStaff = await Staff.find({ staffHash: { $in: staffHashes } });

//   // Group by BVN hash
//   const bvnGroups = new Map<string, typeof allStaff>();
//   allStaff.forEach((staff) => {
//     if (!bvnGroups.has(staff.bvnHash)) {
//       bvnGroups.set(staff.bvnHash, []);
//     }
//     bvnGroups.get(staff.bvnHash)!.push(staff);
//   });

//   // Check for BVN duplicates
//   for (const [bvnHash, staffList] of bvnGroups) {
//     if (staffList.length > 1) {
//       // Found duplicate BVNs
//       for (const staff of staffList) {
//         const record = records.find((r) => r.staffHash === staff.staffHash);
//         if (record) {
//           const flag = await Flag.create({
//             payrollId,
//             staffHash: staff.staffHash,
//             type: FlagType.DUPLICATE,
//             score: 1.0, // 100% confidence - exact BVN match
//             explanation: generateExplanation(FlagType.DUPLICATE, {
//               field: 'BVN',
//               duplicateCount: staffList.length,
//               otherStaffHashes: staffList
//                 .filter((s) => s.staffHash !== staff.staffHash)
//                 .map((s) => s.staffHash),
//             }),
//             metadata: {
//               salary: record.salary,
//               grade: staff.grade,
//               department: staff.department,
//               duplicateField: 'BVN',
//               duplicateCount: staffList.length,
//               otherStaffHashes: staffList
//                 .filter((s) => s.staffHash !== staff.staffHash)
//                 .map((s) => s.staffHash),
//             },
//             reviewed: false,
//             resolution: 'pending',
//           });

//           flags.push(flag);
//         }
//       }
//     }
//   }

//   // Group by NIN hash
//   const ninGroups = new Map<string, typeof allStaff>();
//   allStaff.forEach((staff) => {
//     if (!ninGroups.has(staff.ninHash)) {
//       ninGroups.set(staff.ninHash, []);
//     }
//     ninGroups.get(staff.ninHash)!.push(staff);
//   });

//   // Check for NIN duplicates
//   for (const [ninHash, staffList] of ninGroups) {
//     if (staffList.length > 1) {
//       for (const staff of staffList) {
//         const record = records.find((r) => r.staffHash === staff.staffHash);
//         if (record) {
//           // Check if already flagged for BVN
//           const existingFlag = flags.find(
//             (f) => f.staffHash === staff.staffHash && f.type === FlagType.DUPLICATE
//           );

//           if (!existingFlag) {
//             const flag = await Flag.create({
//               payrollId,
//               staffHash: staff.staffHash,
//               type: FlagType.DUPLICATE,
//               score: 1.0,
//               explanation: generateExplanation(FlagType.DUPLICATE, {
//                 field: 'NIN',
//                 duplicateCount: staffList.length,
//                 otherStaffHashes: staffList
//                   .filter((s) => s.staffHash !== staff.staffHash)
//                   .map((s) => s.staffHash),
//               }),
//               metadata: {
//                 salary: record.salary,
//                 grade: staff.grade,
//                 department: staff.department,
//                 duplicateField: 'NIN',
//                 duplicateCount: staffList.length,
//                 otherStaffHashes: staffList
//                   .filter((s) => s.staffHash !== staff.staffHash)
//                   .map((s) => s.staffHash),
//               },
//               reviewed: false,
//               resolution: 'pending',
//             });

//             flags.push(flag);
//           }
//         }
//       }
//     }
//   }

//   return flags;
// }

// /**
//  * 3. Fuzzy Duplicate Detection - Similar names
//  */
// async function detectFuzzyDuplicates(
//   payrollId: string,
//   records: PayrollRecord[]
// ): Promise<IFlag[]> {
//   const flags: IFlag[] = [];
//   const staffHashes = records.map((r) => r.staffHash);
//   const allStaff = await Staff.find({ staffHash: { $in: staffHashes } });

//   // Decrypt names for comparison
//   const staffWithNames = allStaff.map((staff) => {
//     try {
//       return {
//         staff,
//         name: decrypt(staff.nameEncrypted).toLowerCase().trim(),
//       };
//     } catch (error) {
//       return { staff, name: '' };
//     }
//   });

//   // Compare each name with all others
//   for (let i = 0; i < staffWithNames.length; i++) {
//     for (let j = i + 1; j < staffWithNames.length; j++) {
//       const staff1 = staffWithNames[i];
//       const staff2 = staffWithNames[j];

//       if (!staff1.name || !staff2.name) continue;

//       // Calculate similarity score
//       const similarity = compareTwoStrings(staff1.name, staff2.name);

//       // Flag if similarity > 80% but not exact match
//       if (similarity > 0.8 && similarity < 1.0) {
//         const record1 = records.find((r) => r.staffHash === staff1.staff.staffHash);
//         const record2 = records.find((r) => r.staffHash === staff2.staff.staffHash);

//         if (record1) {
//           const flag = await Flag.create({
//             payrollId,
//             staffHash: staff1.staff.staffHash,
//             type: FlagType.DUPLICATE,
//             score: similarity,
//             explanation: generateExplanation(FlagType.DUPLICATE, {
//               field: 'Name (Fuzzy)',
//               similarity: similarity,
//               matchedWith: staff2.staff.staffHash,
//               name1: staff1.name,
//               name2: staff2.name,
//             }),
//             metadata: {
//               salary: record1.salary,
//               grade: staff1.staff.grade,
//               department: staff1.staff.department,
//               similarityScore: similarity,
//               matchedStaffHash: staff2.staff.staffHash,
//               matchedSalary: record2?.salary,
//             },
//             reviewed: false,
//             resolution: 'pending',
//           });

//           flags.push(flag);
//         }
//       }
//     }
//   }

//   return flags;
// }

// /**
//  * 4. Salary Anomaly Detection
//  */
// async function detectSalaryAnomalies(
//   payrollId: string,
//   records: PayrollRecord[]
// ): Promise<IFlag[]> {
//   const flags: IFlag[] = [];
//   const staffHashes = records.map((r) => r.staffHash);
//   const allStaff = await Staff.find({ staffHash: { $in: staffHashes } });

//   for (const record of records) {
//     const staff = allStaff.find((s) => s.staffHash === record.staffHash);
//     if (!staff) continue;

//     const gradeRange = SALARY_RANGES[staff.grade];

//     if (gradeRange) {
//       const isOutOfRange =
//         record.salary < gradeRange.min || record.salary > gradeRange.max;

//       if (isOutOfRange) {
//         // Calculate anomaly score
//         let score = 0;
//         let deviation = 0;

//         if (record.salary < gradeRange.min) {
//           deviation = ((gradeRange.min - record.salary) / gradeRange.min) * 100;
//           score = Math.min(deviation / 100, 1.0);
//         } else {
//           deviation = ((record.salary - gradeRange.max) / gradeRange.max) * 100;
//           score = Math.min(deviation / 100, 1.0);
//         }

//         const flag = await Flag.create({
//           payrollId,
//           staffHash: record.staffHash,
//           type: FlagType.ANOMALY,
//           score: Math.min(score, 1.0),
//           explanation: generateExplanation(FlagType.ANOMALY, {
//             salary: record.salary,
//             grade: staff.grade,
//             expectedMin: gradeRange.min,
//             expectedMax: gradeRange.max,
//             deviation: deviation.toFixed(1),
//           }),
//           metadata: {
//             salary: record.salary,
//             grade: staff.grade,
//             department: staff.department,
//             expectedMin: gradeRange.min,
//             expectedMax: gradeRange.max,
//             deviationPercent: deviation,
//           },
//           reviewed: false,
//           resolution: 'pending',
//         });

//         flags.push(flag);
//       }
//     }
//   }

//   return flags;
// }

// /**
//  * Generate human-readable explanations
//  */
// function generateExplanation(type: FlagType, data: any): string {
//   switch (type) {
//     case FlagType.GHOST:
//       return `⚠️ Ghost Worker Alert: Staff hash "${data.staffHash.substring(0, 16)}..." not found in the verified staff registry. This staff member may not exist or was never properly registered. Salary: ₦${data.salary.toLocaleString()}.`;

//     case FlagType.MISSING_REGISTRY:
//       return `⚠️ Unverified Staff: Staff exists in database but is not verified on blockchain (${data.blockchainTxs} blockchain transactions). This staff member needs blockchain verification before receiving payments.`;

//     case FlagType.DUPLICATE:
//       if (data.field === 'Name (Fuzzy)') {
//         return `⚠️ Potential Duplicate: Name similarity detected (${(data.similarity * 100).toFixed(1)}% match). This staff member's name is very similar to another registered staff (Hash: ${data.matchedWith.substring(0, 16)}...). Names: "${data.name1}" vs "${data.name2}". Please verify if these are the same person.`;
//       } else {
//         return `🚨 Duplicate ${data.field}: This ${data.field} is already registered to ${data.duplicateCount - 1} other staff member(s). This indicates potential identity fraud or data entry error. Other staff hashes: ${data.otherStaffHashes.map((h: string) => h.substring(0, 8)).join(', ')}...`;
//       }

//     case FlagType.ANOMALY:
//       const direction = data.salary < data.expectedMin ? 'below' : 'above';
//       return `💰 Salary Anomaly: Salary of ₦${data.salary.toLocaleString()} is ${direction} the expected range for ${data.grade} (₦${data.expectedMin.toLocaleString()} - ₦${data.expectedMax.toLocaleString()}). Deviation: ${data.deviation}%. This may indicate an error or special circumstance requiring verification.`;

//     default:
//       return 'Anomaly detected. Please review this record.';
//   }
// }

// export default {
//   runAIDetection,
// };


import Staff from '../models/Staff';
import Flag, { IFlag } from '../models/Flag';
import { FlagType } from '../types';
import { compareTwoStrings } from 'string-similarity';
import { decrypt } from '../utils/encryption';
import { generateAIExplanation } from './groqService';

// Grade salary ranges (Nigerian civil service structure)
const SALARY_RANGES: Record<string, { min: number; max: number }> = {
  'Grade Level 1': { min: 30000, max: 50000 },
  'Grade Level 2': { min: 40000, max: 60000 },
  'Grade Level 3': { min: 50000, max: 70000 },
  'Grade Level 4': { min: 60000, max: 80000 },
  'Grade Level 5': { min: 70000, max: 100000 },
  'Grade Level 6': { min: 90000, max: 130000 },
  'Grade Level 7': { min: 120000, max: 170000 },
  'Grade Level 8': { min: 150000, max: 220000 },
  'Grade Level 9': { min: 200000, max: 280000 },
  'Grade Level 10': { min: 250000, max: 350000 },
  'Grade Level 11': { min: 300000, max: 420000 },
  'Grade Level 12': { min: 350000, max: 500000 },
  'Grade Level 13': { min: 400000, max: 600000 },
  'Grade Level 14': { min: 500000, max: 750000 },
  'Grade Level 15': { min: 600000, max: 900000 },
  'Grade Level 16': { min: 700000, max: 1100000 },
  'Grade Level 17': { min: 800000, max: 1300000 },
};

interface PayrollRecord {
  staffHash: string;
  salary: number;
  status: string;
  flags: any[];
}

interface DetectionResult {
  flags: IFlag[];
  summary: {
    totalRecords: number;
    ghostWorkers: number;
    duplicates: number;
    salaryAnomalies: number;
    totalFlags: number;
  };
}

/**
 * Main AI detection function - runs all checks
 */
export const runAIDetection = async (
  payrollId: string,
  payrollRecords: PayrollRecord[]
): Promise<DetectionResult> => {
  console.log(`🤖 Running AI detection on ${payrollRecords.length} records...`);

  const allFlags: IFlag[] = [];

  // 1. Ghost Worker Detection
  const ghostFlags = await detectGhostWorkers(payrollId, payrollRecords);
  allFlags.push(...ghostFlags);

  // 2. Duplicate Detection (BVN/NIN)
  const duplicateFlags = await detectDuplicates(payrollId, payrollRecords);
  allFlags.push(...duplicateFlags);

  // 3. Fuzzy Name Matching
  const fuzzyFlags = await detectFuzzyDuplicates(payrollId, payrollRecords);
  allFlags.push(...fuzzyFlags);

  // 4. Salary Anomaly Detection
  const salaryFlags = await detectSalaryAnomalies(payrollId, payrollRecords);
  allFlags.push(...salaryFlags);

  const summary = {
    totalRecords: payrollRecords.length,
    ghostWorkers: ghostFlags.length,
    duplicates: duplicateFlags.length,
    salaryAnomalies: salaryFlags.length,
    totalFlags: allFlags.length,
  };

  console.log(`✅ Detection complete: ${allFlags.length} flags created`);
  console.log(`   - Ghost workers: ${ghostFlags.length}`);
  console.log(`   - Duplicates: ${duplicateFlags.length}`);
  console.log(`   - Salary anomalies: ${salaryFlags.length}`);

  return { flags: allFlags, summary };
};

/**
 * 1. Ghost Worker Detection - Staff not in registry
 */
async function detectGhostWorkers(
  payrollId: string,
  records: PayrollRecord[]
): Promise<IFlag[]> {
  const flags: IFlag[] = [];

  for (const record of records) {
    const staff = await Staff.findOne({ staffHash: record.staffHash });

    if (!staff) {
      const templateExplanation = generateExplanation(FlagType.GHOST, {
        staffHash: record.staffHash,
        salary: record.salary,
      });

      // Generate AI-enhanced explanation
      const explanation = await generateAIExplanation(
        FlagType.GHOST,
        {
          staffHash: record.staffHash,
          salary: record.salary,
        },
        templateExplanation
      );

      const flag = await Flag.create({
        payrollId,
        staffHash: record.staffHash,
        type: FlagType.GHOST,
        score: 1.0,
        explanation,
        metadata: {
          salary: record.salary,
          reason: 'Staff hash not found in registry',
        },
        reviewed: false,
        resolution: 'pending',
      });

      flags.push(flag);
    } else if (!staff.verified) {
      // Staff exists but not verified on blockchain
      const templateExplanation = generateExplanation(FlagType.MISSING_REGISTRY, {
        staffHash: record.staffHash,
        verified: staff.verified,
        blockchainTxs: staff.blockchainTxs.length,
      });

      const explanation = await generateAIExplanation(
        FlagType.MISSING_REGISTRY,
        {
          staffHash: record.staffHash,
          verified: staff.verified,
          blockchainTxs: staff.blockchainTxs.length,
        },
        templateExplanation
      );

      const flag = await Flag.create({
        payrollId,
        staffHash: record.staffHash,
        type: FlagType.MISSING_REGISTRY,
        score: 0.9,
        explanation,
        metadata: {
          salary: record.salary,
          grade: staff.grade,
          department: staff.department,
          blockchainTxs: staff.blockchainTxs,
        },
        reviewed: false,
        resolution: 'pending',
      });

      flags.push(flag);
    }
  }

  return flags;
}

/**
 * 2. Duplicate Detection - Exact BVN/NIN matches
 */
async function detectDuplicates(
  payrollId: string,
  records: PayrollRecord[]
): Promise<IFlag[]> {
  const flags: IFlag[] = [];
  const staffHashes = records.map((r) => r.staffHash);

  // Get all staff for these hashes
  const allStaff = await Staff.find({ staffHash: { $in: staffHashes } });

  // Group by BVN hash
  const bvnGroups = new Map<string, typeof allStaff>();
  allStaff.forEach((staff) => {
    if (!bvnGroups.has(staff.bvnHash)) {
      bvnGroups.set(staff.bvnHash, []);
    }
    bvnGroups.get(staff.bvnHash)!.push(staff);
  });

  // Check for BVN duplicates
  for (const [bvnHash, staffList] of bvnGroups) {
    if (staffList.length > 1) {
      // Found duplicate BVNs
      for (const staff of staffList) {
        const record = records.find((r) => r.staffHash === staff.staffHash);
        if (record) {
          const flag = await Flag.create({
            payrollId,
            staffHash: staff.staffHash,
            type: FlagType.DUPLICATE,
            score: 1.0, // 100% confidence - exact BVN match
            explanation: generateExplanation(FlagType.DUPLICATE, {
              field: 'BVN',
              duplicateCount: staffList.length,
              otherStaffHashes: staffList
                .filter((s) => s.staffHash !== staff.staffHash)
                .map((s) => s.staffHash),
            }),
            metadata: {
              salary: record.salary,
              grade: staff.grade,
              department: staff.department,
              duplicateField: 'BVN',
              duplicateCount: staffList.length,
              otherStaffHashes: staffList
                .filter((s) => s.staffHash !== staff.staffHash)
                .map((s) => s.staffHash),
            },
            reviewed: false,
            resolution: 'pending',
          });

          flags.push(flag);
        }
      }
    }
  }

  // Group by NIN hash
  const ninGroups = new Map<string, typeof allStaff>();
  allStaff.forEach((staff) => {
    if (!ninGroups.has(staff.ninHash)) {
      ninGroups.set(staff.ninHash, []);
    }
    ninGroups.get(staff.ninHash)!.push(staff);
  });

  // Check for NIN duplicates
  for (const [ninHash, staffList] of ninGroups) {
    if (staffList.length > 1) {
      for (const staff of staffList) {
        const record = records.find((r) => r.staffHash === staff.staffHash);
        if (record) {
          // Check if already flagged for BVN
          const existingFlag = flags.find(
            (f) => f.staffHash === staff.staffHash && f.type === FlagType.DUPLICATE
          );

          if (!existingFlag) {
            const flag = await Flag.create({
              payrollId,
              staffHash: staff.staffHash,
              type: FlagType.DUPLICATE,
              score: 1.0,
              explanation: generateExplanation(FlagType.DUPLICATE, {
                field: 'NIN',
                duplicateCount: staffList.length,
                otherStaffHashes: staffList
                  .filter((s) => s.staffHash !== staff.staffHash)
                  .map((s) => s.staffHash),
              }),
              metadata: {
                salary: record.salary,
                grade: staff.grade,
                department: staff.department,
                duplicateField: 'NIN',
                duplicateCount: staffList.length,
                otherStaffHashes: staffList
                  .filter((s) => s.staffHash !== staff.staffHash)
                  .map((s) => s.staffHash),
              },
              reviewed: false,
              resolution: 'pending',
            });

            flags.push(flag);
          }
        }
      }
    }
  }

  return flags;
}

/**
 * 3. Fuzzy Duplicate Detection - Similar names
 */
async function detectFuzzyDuplicates(
  payrollId: string,
  records: PayrollRecord[]
): Promise<IFlag[]> {
  const flags: IFlag[] = [];
  const staffHashes = records.map((r) => r.staffHash);
  const allStaff = await Staff.find({ staffHash: { $in: staffHashes } });

  // Decrypt names for comparison
  const staffWithNames = allStaff.map((staff) => {
    try {
      return {
        staff,
        name: decrypt(staff.nameEncrypted).toLowerCase().trim(),
      };
    } catch (error) {
      return { staff, name: '' };
    }
  });

  // Compare each name with all others
  for (let i = 0; i < staffWithNames.length; i++) {
    for (let j = i + 1; j < staffWithNames.length; j++) {
      const staff1 = staffWithNames[i];
      const staff2 = staffWithNames[j];

      if (!staff1.name || !staff2.name) continue;

      // Calculate similarity score
      const similarity = compareTwoStrings(staff1.name, staff2.name);

      // Flag if similarity > 80% but not exact match
      if (similarity > 0.8 && similarity < 1.0) {
        const record1 = records.find((r) => r.staffHash === staff1.staff.staffHash);
        const record2 = records.find((r) => r.staffHash === staff2.staff.staffHash);

        if (record1) {
          const flag = await Flag.create({
            payrollId,
            staffHash: staff1.staff.staffHash,
            type: FlagType.DUPLICATE,
            score: similarity,
            explanation: generateExplanation(FlagType.DUPLICATE, {
              field: 'Name (Fuzzy)',
              similarity: similarity,
              matchedWith: staff2.staff.staffHash,
              name1: staff1.name,
              name2: staff2.name,
            }),
            metadata: {
              salary: record1.salary,
              grade: staff1.staff.grade,
              department: staff1.staff.department,
              similarityScore: similarity,
              matchedStaffHash: staff2.staff.staffHash,
              matchedSalary: record2?.salary,
            },
            reviewed: false,
            resolution: 'pending',
          });

          flags.push(flag);
        }
      }
    }
  }

  return flags;
}

/**
 * 4. Salary Anomaly Detection
 */
async function detectSalaryAnomalies(
  payrollId: string,
  records: PayrollRecord[]
): Promise<IFlag[]> {
  const flags: IFlag[] = [];
  const staffHashes = records.map((r) => r.staffHash);
  const allStaff = await Staff.find({ staffHash: { $in: staffHashes } });

  console.log(`💰 Checking salary anomalies for ${records.length} records...`);

  for (const record of records) {
    const staff = allStaff.find((s) => s.staffHash === record.staffHash);
    if (!staff) {
      console.log(`  ⏭️  Skipping ${record.staffHash.substring(0, 8)}... (not in registry)`);
      continue;
    }

    const gradeRange = SALARY_RANGES[staff.grade];

    if (!gradeRange) {
      console.log(`  ⚠️  No salary range defined for grade: ${staff.grade}`);
      continue;
    }

    console.log(`  📊 Checking ${staff.grade}: ₦${record.salary.toLocaleString()} (Range: ₦${gradeRange.min.toLocaleString()} - ₦${gradeRange.max.toLocaleString()})`);

    const isOutOfRange =
      record.salary < gradeRange.min || record.salary > gradeRange.max;

    if (isOutOfRange) {
      // Calculate anomaly score
      let score = 0;
      let deviation = 0;

      if (record.salary < gradeRange.min) {
        deviation = ((gradeRange.min - record.salary) / gradeRange.min) * 100;
        score = Math.min(deviation / 100, 1.0);
        console.log(`  🚨 BELOW minimum by ${deviation.toFixed(1)}%`);
      } else {
        deviation = ((record.salary - gradeRange.max) / gradeRange.max) * 100;
        score = Math.min(deviation / 100, 1.0);
        console.log(`  🚨 ABOVE maximum by ${deviation.toFixed(1)}%`);
      }

      const flag = await Flag.create({
        payrollId,
        staffHash: record.staffHash,
        type: FlagType.ANOMALY,
        score: Math.min(score, 1.0),
        explanation: generateExplanation(FlagType.ANOMALY, {
          salary: record.salary,
          grade: staff.grade,
          expectedMin: gradeRange.min,
          expectedMax: gradeRange.max,
          deviation: deviation.toFixed(1),
        }),
        metadata: {
          salary: record.salary,
          grade: staff.grade,
          department: staff.department,
          expectedMin: gradeRange.min,
          expectedMax: gradeRange.max,
          deviationPercent: deviation,
        },
        reviewed: false,
        resolution: 'pending',
      });

      flags.push(flag);
    } else {
      console.log(`  ✅ Salary within range`);
    }
  }

  console.log(`💰 Salary anomaly detection complete: ${flags.length} anomalies found`);
  return flags;
}

/**
 * Generate human-readable explanations
 */
function generateExplanation(type: FlagType, data: any): string {
  switch (type) {
    case FlagType.GHOST:
      return `⚠️ Ghost Worker Alert: Staff hash "${data.staffHash.substring(0, 16)}..." not found in the verified staff registry. This staff member may not exist or was never properly registered. Salary: ₦${data.salary.toLocaleString()}.`;

    case FlagType.MISSING_REGISTRY:
      return `⚠️ Unverified Staff: Staff exists in database but is not verified on blockchain (${data.blockchainTxs} blockchain transactions). This staff member needs blockchain verification before receiving payments.`;

    case FlagType.DUPLICATE:
      if (data.field === 'Name (Fuzzy)') {
        return `⚠️ Potential Duplicate: Name similarity detected (${(data.similarity * 100).toFixed(1)}% match). This staff member's name is very similar to another registered staff (Hash: ${data.matchedWith.substring(0, 16)}...). Names: "${data.name1}" vs "${data.name2}". Please verify if these are the same person.`;
      } else {
        return `🚨 Duplicate ${data.field}: This ${data.field} is already registered to ${data.duplicateCount - 1} other staff member(s). This indicates potential identity fraud or data entry error. Other staff hashes: ${data.otherStaffHashes.map((h: string) => h.substring(0, 8)).join(', ')}...`;
      }

    case FlagType.ANOMALY:
      const direction = data.salary < data.expectedMin ? 'below' : 'above';
      return `💰 Salary Anomaly: Salary of ₦${data.salary.toLocaleString()} is ${direction} the expected range for ${data.grade} (₦${data.expectedMin.toLocaleString()} - ₦${data.expectedMax.toLocaleString()}). Deviation: ${data.deviation}%. This may indicate an error or special circumstance requiring verification.`;

    default:
      return 'Anomaly detected. Please review this record.';
  }
}

export default {
  runAIDetection,
};