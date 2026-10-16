import 'dotenv/config';
import dataSource from '../datasource';
import { ContentRecord } from '../../app/modules/content/content.entity';

const demoSocialLinks = [
  {
    label: 'Facebook (replace with official page)',
    url: 'https://example.com/grace-community-facebook',
    visible: false,
  },
  {
    label: 'Instagram (replace with official profile)',
    url: 'https://example.com/grace-community-instagram',
    visible: false,
  },
  {
    label: 'YouTube (replace with official channel)',
    url: 'https://example.com/grace-community-youtube',
    visible: false,
  },
];

function defaultChurchDetails() {
  const address = 'KG 7 Avenue, Kigali';
  const city = 'Kigali';
  const country = 'Rwanda';
  const query = encodeURIComponent([address, city, country].filter(Boolean).join(', '));

  return {
    contentKey: 'church-information',
    profile: { history: '', imageUrl: '', imageAlt: '', logoUrl: '', logoAlt: '' },
    contact: {
      address,
      city,
      country,
      phone: '',
      email: '',
      directionsUrl: `https://maps.google.com/?q=${query}`,
      mapUrl: `https://www.google.com/maps?q=${query}&output=embed`,
    },
    mission: { heading: '', statement: '', description: '', visible: true },
    vision: { heading: '', statement: '', description: '', visible: true },
    coreValues: [],
    beliefs: [],
    socialLinks: demoSocialLinks,
  };
}

async function seedWebsiteSettings() {
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();

  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query('SELECT pg_advisory_xact_lock(1760140000001)');

    const records = runner.manager.getRepository(ContentRecord);
    const existing = await records.findOneBy({ type: 'settings', slug: 'church-information' });
    const defaults = defaultChurchDetails();

    if (!existing) {
      await records.save(records.create({
        type: 'settings',
        title: 'Grace Community Church',
        slug: 'church-information',
        description: 'A welcoming Kigali church where people grow in faith, find community, and serve their neighbors.',
        details: defaults,
        published: true,
        publishedAt: new Date(),
      }));
    } else {
      const details = existing.details ?? {};
      const contact = (details.contact && typeof details.contact === 'object' ? details.contact : {}) as Record<string, unknown>;
      const socialLinks = Array.isArray(details.socialLinks) ? details.socialLinks : [];
      const locationQuery = encodeURIComponent([
        contact.address || defaults.contact.address,
        contact.city || defaults.contact.city,
        contact.country || defaults.contact.country,
      ].filter(Boolean).join(', '));
      await records.save({
        ...existing,
        details: {
          ...defaults,
          ...details,
          contentKey: 'church-information',
          profile: { ...defaults.profile, ...(details.profile as Record<string, unknown> | undefined) },
          contact: {
            ...defaults.contact,
            ...contact,
            directionsUrl: contact.directionsUrl || `https://maps.google.com/?q=${locationQuery}`,
            mapUrl: contact.mapUrl || `https://www.google.com/maps?q=${locationQuery}&output=embed`,
          },
          mission: { ...defaults.mission, ...(details.mission as Record<string, unknown> | undefined) },
          vision: { ...defaults.vision, ...(details.vision as Record<string, unknown> | undefined) },
          coreValues: Array.isArray(details.coreValues) ? details.coreValues : defaults.coreValues,
          beliefs: Array.isArray(details.beliefs) ? details.beliefs : defaults.beliefs,
          socialLinks: socialLinks.length ? socialLinks : demoSocialLinks,
        },
      });
    }

    await runner.commitTransaction();
    console.log('Church location and social-link settings seeded. Replace demo social URLs before making them visible.');
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

seedWebsiteSettings().catch((error: unknown) => {
  console.error('Website settings seed failed:', error);
  process.exitCode = 1;
});
