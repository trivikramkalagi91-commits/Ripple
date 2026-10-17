import { FalkorDB } from 'falkordb';

async function testConnection() {
  console.log('Connecting to FalkorDB on localhost:6379...');
  const db = await FalkorDB.connect({
    socket: {
      host: 'localhost',
      port: 6379,
    },
  });

  const graph = db.selectGraph('ripple_test');
  console.log('Selected graph "ripple_test"');

  // Create a test node
  console.log('Creating test node (:TestNode {name: "ping"})...');
  await graph.query('CREATE (n:TestNode {name: "ping", timestamp: timestamp()})');

  // Read it back
  const readResult = await graph.query('MATCH (n:TestNode {name: "ping"}) RETURN n.name as name');
  console.log('Read query result:', JSON.stringify(readResult.data));

  // Clean up test graph
  console.log('Deleting test node...');
  await graph.query('MATCH (n:TestNode) DELETE n');
  console.log('Cleaned up test nodes.');

  await db.close();
  console.log('FalkorDB connection test PASSED successfully!');
}

testConnection().catch((err) => {
  console.error('FalkorDB connection test FAILED:', err);
  process.exit(1);
});
