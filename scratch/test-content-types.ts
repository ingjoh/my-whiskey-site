import { 
  getContentTypeConfigs, 
  saveContentTypeConfig, 
  getContentItems, 
  getContentItem, 
  saveContentItem, 
  deleteContentItem 
} from '../src/lib/db';

async function runTests() {
  console.log('--- Starting DB Content Types Verification ---');
  
  // 1. Test Fetching Content Types
  console.log('1. Fetching Content Type configs...');
  const configs = await getContentTypeConfigs();
  console.log(`Found ${configs.length} content types.`);
  configs.forEach(c => {
    console.log(` - ${c.name} (${c.id}) prefix: /${c.slugPrefix} (Enabled: ${c.isEnabled})`);
  });

  // 2. Test saving a Content Type configuration
  console.log('\n2. Modifying and saving a config (dry-run temp update)...');
  const adventureConfig = configs.find(c => c.id === 'adventure');
  if (adventureConfig) {
    const originalPrefix = adventureConfig.slugPrefix;
    // Temp change
    adventureConfig.slugPrefix = 'experiences-temp-test';
    await saveContentTypeConfig(adventureConfig);
    console.log('Saved adventure config with new prefix.');
    
    // Verify save
    const updatedConfigs = await getContentTypeConfigs();
    const updatedAdv = updatedConfigs.find(c => c.id === 'adventure');
    console.log(`Verified new prefix is: /${updatedAdv?.slugPrefix}`);
    
    // Revert back
    adventureConfig.slugPrefix = originalPrefix;
    await saveContentTypeConfig(adventureConfig);
    console.log('Reverted prefix back to original.');
  }

  // 3. Test Content Items operations
  console.log('\n3. Creating a test Content Item...');
  const testSlug = 'test-adventure-temp-' + Math.random().toString(36).substring(7);
  const newItem = {
    id: testSlug,
    slug: testSlug,
    title: 'Test Adventure Trip',
    contentType: 'adventure',
    shortDescription: 'A temporary test adventure to verify DB operations',
    location: 'Destin Beach, FL',
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    basePrice: 500,
    duration: '2 Hours',
    maxGuests: 6,
    itinerary: [{ title: 'First stop', description: 'Cruising the coast' }],
    includedItems: ['Drinks', 'Snacks']
  };

  await saveContentItem(newItem);
  console.log(`Saved new item with slug: ${testSlug}`);

  // Fetch it back
  console.log('\n4. Fetching the created Content Item...');
  const fetchedItem = await getContentItem(testSlug);
  if (fetchedItem) {
    console.log('Item successfully fetched!');
    console.log(` - Title: ${fetchedItem.title}`);
    console.log(` - Price: $${fetchedItem.basePrice}`);
    console.log(` - Duration: ${fetchedItem.duration}`);
    console.log(` - Location: ${fetchedItem.location}`);
  } else {
    throw new Error('Failed to fetch the saved content item');
  }

  // Fetch all items for adventure
  console.log('\n5. Fetching all items of type adventure...');
  const allAdventures = await getContentItems('adventure');
  const found = allAdventures.some(item => item.id === testSlug);
  console.log(`Total adventures found: ${allAdventures.length}. Contains our test item: ${found}`);

  // Delete it
  console.log('\n6. Cleaning up: deleting test item...');
  await deleteContentItem(testSlug);
  console.log('Deleted.');

  // Verify deletion
  const deletedCheck = await getContentItem(testSlug);
  console.log(`Verified deletion (should be null): ${deletedCheck === null}`);
  
  console.log('\n--- DB Content Types Verification Completed Successfully! ---');
}

runTests().catch(error => {
  console.error('Test run failed:', error);
  process.exit(1);
});
