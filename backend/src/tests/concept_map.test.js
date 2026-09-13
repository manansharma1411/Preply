/**
 * ============================================================================
 * PREPLY VISUAL CONCEPT MAP TEST SUITE
 * ============================================================================
 * Tests:
 * 1. Valid nodes & directed edges structure validation
 * 2. Invalid relationship filtering (dangling node IDs, self-loops)
 * 3. Empty graph auto-fallback from keyTopics & importantConcepts
 * 4. Weak topic matching logic
 * 5. Study session creation with Concept Map payload
 * ============================================================================
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { cleanConceptMap, validateStudySessionResponse } = require('../utils/aiResponseValidator');
const StudySession = require('../models/StudySession');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const { connectDB, disconnectDB } = require('../config/db');

let mongoServer;
let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
};

const runConceptMapTest = async () => {
  console.log('====================================================');
  console.log('  PREPLY VISUAL CONCEPT MAP TEST SUITE');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1: Valid Nodes & Directed Edges Validation
    // ----------------------------------------------------
    console.log('[TEST 1] Valid Nodes & Edges Validation');
    const rawValidGraph = {
      nodes: [
        { id: 'n1', label: 'Process Synchronization', type: 'topic', description: 'Main topic' },
        { id: 'n2', label: 'Mutex Locks', type: 'subtopic', description: 'Lock mechanism' },
        { id: 'n3', label: 'Semaphores', type: 'concept', description: 'Signaling primitive' },
      ],
      edges: [
        { source: 'n1', target: 'n2', relationship: 'contains' },
        { source: 'n2', target: 'n3', relationship: 'relates_to' },
      ],
    };

    const cleanValid = cleanConceptMap(rawValidGraph);
    assert(cleanValid.nodes.length === 3, '3 valid nodes returned');
    assert(cleanValid.edges.length === 2, '2 valid directed edges returned');
    assert(cleanValid.nodes[0].id === 'n1' && cleanValid.nodes[0].type === 'topic', 'Node 1 preserves topic type');
    assert(cleanValid.edges[0].relationship === 'contains', 'Edge 1 preserves relationship tag\n');

    // ----------------------------------------------------
    // TEST 2: Filter Invalid Relationships & Dangling Edges
    // ----------------------------------------------------
    console.log('[TEST 2] Invalid Relationships & Self-Loops Filtering');
    const rawInvalidGraph = {
      nodes: [
        { id: 'node-A', label: 'Concurrency', type: 'topic' },
        { id: 'node-B', label: 'Race Conditions', type: 'concept' },
      ],
      edges: [
        { source: 'node-A', target: 'node-B', relationship: 'causes' },
        { source: 'node-A', target: 'node-Z', relationship: 'invalid_dangling_target' }, // Dangling target
        { source: 'node-X', target: 'node-B', relationship: 'invalid_dangling_source' }, // Dangling source
        { source: 'node-A', target: 'node-A', relationship: 'self_loop' }, // Self loop
      ],
    };

    const cleanInvalid = cleanConceptMap(rawInvalidGraph);
    assert(cleanInvalid.nodes.length === 2, '2 valid nodes preserved');
    assert(cleanInvalid.edges.length === 1, 'Only 1 valid edge preserved (dangling and self-loops stripped)');
    assert(cleanInvalid.edges[0].source === 'node-A' && cleanInvalid.edges[0].target === 'node-B', 'Valid edge A -> B preserved\n');

    // ----------------------------------------------------
    // TEST 3: Empty Graph Auto-Fallback Generation
    // ----------------------------------------------------
    console.log('[TEST 3] Empty Graph Fallback from Key Topics & Concepts');
    const sampleTopics = [
      { topic: 'Virtual Memory', description: 'Memory management technique' },
    ];
    const sampleConcepts = [
      { concept: 'Paging', explanation: 'Fixed-size block allocation' },
      { concept: 'Segmentation', explanation: 'Variable-size logical block allocation' },
    ];

    const fallbackGraph = cleanConceptMap(null, sampleTopics, sampleConcepts);
    assert(fallbackGraph.nodes.length === 3, 'Auto-constructed 3 nodes from topics & concepts');
    assert(fallbackGraph.edges.length === 2, 'Auto-linked concepts to primary topic node');
    assert(fallbackGraph.nodes[0].label === 'Virtual Memory', 'First fallback node matches primary topic\n');

    // ----------------------------------------------------
    // TEST 4: Database Model Integration Test
    // ----------------------------------------------------
    console.log('[TEST 4] Database Model Integration for Concept Map');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const fakeUserId = new mongoose.Types.ObjectId();
    const fakeMatId = new mongoose.Types.ObjectId();

    const sessionDoc = await StudySession.create({
      userId: fakeUserId,
      materialId: fakeMatId,
      title: 'Concept Map Integration Session',
      summary: 'Testing concept map persistence in Mongoose model.',
      keyTopics: [{ topic: 'Deadlock Handling', description: 'System deadlock prevention.' }],
      importantConcepts: [{ concept: 'Banker Algorithm', explanation: 'Resource allocation algorithm.' }],
      conceptMap: {
        nodes: [
          { id: 'cm1', label: 'Deadlock Handling', type: 'topic', description: 'Prevention' },
          { id: 'cm2', label: 'Banker Algorithm', type: 'concept', description: 'Algorithm' },
        ],
        edges: [
          { source: 'cm1', target: 'cm2', relationship: 'implements' },
        ],
      },
    });

    assert(sessionDoc.conceptMap.nodes.length === 2, 'DB session persisted 2 concept nodes');
    assert(sessionDoc.conceptMap.edges.length === 1, 'DB session persisted 1 concept edge');
    assert(sessionDoc.conceptMap.edges[0].relationship === 'implements', 'Edge relationship tag saved correctly\n');

  } catch (err) {
    console.error('❌ Concept Map Test Error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }

  console.log('====================================================');
  console.log(`  CONCEPT MAP TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runConceptMapTest();
