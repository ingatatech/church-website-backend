import 'dotenv/config';
import dataSource from '../datasource';
import { ContentRecord } from '../../app/modules/content/content.entity';
import { ChurchEvent } from '../../app/modules/events/entities/church-event.entity';
import { Ministry } from '../../app/modules/ministries/entities/ministry.entity';
import { PublicationStatus, Sermon } from '../../app/modules/sermons/entities/sermon.entity';
import { Speaker } from '../../app/modules/sermons/entities/speaker.entity';

const photo = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

async function seedHomepage() {
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query('SELECT pg_advisory_xact_lock(1760140000000)');

    const records = runner.manager.getRepository(ContentRecord);
    const ministries = runner.manager.getRepository(Ministry);
    const events = runner.manager.getRepository(ChurchEvent);
    const sermons = runner.manager.getRepository(Sermon);
    const speakers = runner.manager.getRepository(Speaker);
    const now = new Date();

    const settings = [
      {
        type: 'settings' as const,
        title: 'Grace Community Church',
        slug: 'church-information',
        description: 'A welcoming Kigali church where people grow in faith, find community, and serve their neighbors.',
        details: {
          contentKey: 'church-information',
          profile: {
            history: 'Grace Community Church began as a small gathering of neighbors who wanted to worship, learn, and serve together. Today, that same spirit of welcome shapes everything we do.',
            imageUrl: photo('photo-1438232992991-995b7058bbb3'),
            imageAlt: 'Congregation gathered for worship',
          },
          contact: {
            city: 'Kigali', country: 'Rwanda', address: 'KG 7 Avenue, Kigali',
            phone: '+250 788 000 123', email: 'hello@gracecommunity.example',
            directionsUrl: 'https://maps.google.com/?q=Kigali+Rwanda', mapUrl: '',
          },
          mission: {
            heading: 'Our mission', statement: 'To love God, care for one another, and serve our city.',
            description: 'We make room for people to encounter Jesus and put faith into action every day.', visible: true,
          },
          vision: {
            heading: 'Our vision', statement: 'A hopeful community where every person can flourish.',
            description: 'We want to see lives strengthened, families supported, and neighborhoods transformed by practical love.', visible: true,
          },
          coreValues: [
            { title: 'Faith', description: 'We grow through worship, prayer, and Scripture.', order: 0, visible: true },
            { title: 'Welcome', description: 'Every person is met with warmth and respect.', order: 1, visible: true },
            { title: 'Service', description: 'We use what we have to care for our neighbors.', order: 2, visible: true },
            { title: 'Community', description: 'We make time to listen, learn, and grow together.', order: 3, visible: true },
          ], beliefs: [], socialLinks: [],
        },
      },
      {
        type: 'settings' as const,
        title: 'Home',
        slug: 'homepage',
        description: 'Grace Community Church homepage layout and content.',
        details: {
          contentKey: 'homepage',
          hero: {
            heading: 'A place to belong,\na faith to grow.',
            description: 'Come as you are. Find a welcoming community, grow in faith, and discover ways to serve.',
            imageUrl: photo('photo-1507692049790-de58290a4334', 2200),
            imageAlt: 'Warm light falling through a church sanctuary', visible: true,
            primaryCtaLabel: 'Plan your visit', primaryCtaHref: '/plan-your-visit',
            secondaryCtaLabel: 'Explore our church', secondaryCtaHref: '/about',
          },
          sections: {
            welcome: { visible: true, order: 0, heading: 'Room to grow. A community to grow with.', description: 'Whether you are exploring faith or looking for a church to call home, there is a place for you here.', imageUrl: photo('photo-1511632765486-a01980e01a18'), imageAlt: 'Friends sharing time together outdoors', primaryCtaLabel: 'Our story', primaryCtaHref: '/about/our-story' },
            facts: { visible: true, order: 1, heading: 'At a glance', description: '' },
            services: { visible: true, order: 2, heading: 'There’s a seat for you.', description: 'Gather with us throughout the week.' },
            about: { visible: true, order: 3, heading: 'Faith that finds its way into everyday life.', description: 'We believe church is more than a Sunday gathering. It is a community learning to love God and care for one another.', primaryCtaLabel: 'What guides us', primaryCtaHref: '/about/mission-vision' },
            ministries: { visible: true, order: 4, heading: 'There’s a place to connect.', description: 'Find your people and grow through serving together.', limit: 6, featuredMinistryIds: [] },
            events: { visible: true, order: 5, heading: 'Coming up in our community.', description: '', limit: 3 },
            announcements: { visible: true, order: 6, heading: 'A few things to know.', description: '', limit: 3 },
            sermons: { visible: true, order: 7, heading: 'Take the message with you.', description: '', limit: 3 },
            testimonials: { visible: true, order: 8, heading: 'Faith lived, shared, and growing.', description: '', limit: 3 },
            gallery: { visible: true, order: 9, heading: 'Moments we share.', description: '', limit: 6 },
            contact: { visible: true, order: 10, heading: 'Come see what community can feel like.', description: 'We would love to welcome you, answer your questions, and help you plan your first visit.', primaryCtaLabel: 'Get in touch', primaryCtaHref: '/contact', secondaryCtaLabel: 'Ask for prayer', secondaryCtaHref: '/prayer-request' },
          },
        },
      },
    ];
    for (const input of settings) {
      const existing = await records.findOneBy({ type: 'settings', slug: input.slug });
      await records.save(records.create({
        ...existing,
        ...input,
        published: true,
        publishedAt: existing?.publishedAt ?? now,
      }));
    }

    const ministryRows = [
      { slug: 'children', name: 'Children', description: 'A joyful, safe place for children to learn about faith and build friendships.', leader: 'Grace Team', targetAudience: 'Children and families', meetingSchedule: 'Sundays during the main service', imageUrl: photo('photo-1503454537195-1dcabb73ffb9') },
      { slug: 'youth', name: 'Youth', description: 'A place for young people to ask honest questions, grow in faith, and have fun.', leader: 'Daniel K.', targetAudience: 'Teenagers and young adults', meetingSchedule: 'Fridays at 5:30 PM', imageUrl: photo('photo-1529156069898-49953e39b3ac') },
      { slug: 'worship', name: 'Worship', description: 'Musicians and singers helping our church gather and worship together.', leader: 'Sarah M.', targetAudience: 'All ages', meetingSchedule: 'Rehearsals on Thursday evenings', imageUrl: photo('photo-1507838153414-b4b713384a76') },
      { slug: 'community-care', name: 'Community Care', description: 'Practical support and friendship for neighbors navigating a difficult season.', leader: 'Community Care Team', targetAudience: 'Neighbors and families', meetingSchedule: 'Monthly service days', imageUrl: photo('photo-1531206715517-5c0ba140b2b8') },
    ];
    for (const input of ministryRows) {
      const existing = await ministries.findOneBy({ slug: input.slug });
      await ministries.save(ministries.create({
        ...existing, ...input, status: PublicationStatus.PUBLISHED,
        location: 'Kigali, Rwanda', contactEmail: 'hello@gracecommunity.example',
      }));
    }

    const eventRows = [
      { name: 'Community Welcome Sunday', date: day(7), time: '10:00', location: 'Main sanctuary', description: 'Stay after the service for coffee, conversation, and a chance to meet the community.', flyerUrl: photo('photo-1511632765486-a01980e01a18'), registrationRequired: false },
      { name: 'Neighborhood Serve Day', date: day(14), time: '09:00', location: 'Church courtyard', description: 'Spend a morning sharing practical care with families and neighbors in our area.', flyerUrl: photo('photo-1531206715517-5c0ba140b2b8'), registrationRequired: true },
      { name: 'Evening of Prayer', date: day(21), time: '18:00', location: 'Prayer room', description: 'An open evening to pause, pray together, and encourage one another.', flyerUrl: photo('photo-1504052434569-70ad5836ab65'), registrationRequired: false },
    ];
    for (const input of eventRows) {
      const existing = await events.findOneBy({ name: input.name });
      await events.save(events.create({
        ...existing, ...input, status: PublicationStatus.PUBLISHED,
        organizer: 'Grace Community Church', contactInfo: 'hello@gracecommunity.example',
        mapUrl: 'https://maps.google.com/?q=Kigali+Rwanda',
      }));
    }

    const speakerRows = [
      { name: 'Pastor Jean M.', slug: 'pastor-jean-m', title: 'Pastor and teacher', bio: 'Jean serves the Grace Community Church family through teaching and pastoral care.' },
      { name: 'Pastor Aline N.', slug: 'pastor-aline-n', title: 'Pastor and community leader', bio: 'Aline helps connect faith with practical care for our neighbors.' },
    ];
    const speakerIds = new Map<string, string>();
    for (const input of speakerRows) {
      const existing = await speakers.findOneBy({ slug: input.slug });
      const saved = await speakers.save(speakers.create({ ...existing, ...input }));
      speakerIds.set(input.name, saved.id);
    }

    const sermonRows = [
      { slug: 'room-at-the-table', title: 'There Is Room at the Table', speaker: 'Pastor Jean M.', date: day(-7), scripture: 'Luke 14:15-24', category: 'Community', series: 'A Wider Welcome', description: 'A reflection on making room for people we might not expect.', thumbnailUrl: photo('photo-1511632765486-a01980e01a18') },
      { slug: 'faith-in-the-everyday', title: 'Faith in the Everyday', speaker: 'Pastor Jean M.', date: day(-14), scripture: 'Colossians 3:12-17', category: 'Faith', series: 'Small Steps', description: 'Simple practices that help faith shape our ordinary days.', thumbnailUrl: photo('photo-1507692049790-de58290a4334') },
      { slug: 'hope-for-the-journey', title: 'Hope for the Journey', speaker: 'Pastor Aline N.', date: day(-21), scripture: 'Romans 15:13', category: 'Hope', series: 'Rooted', description: 'Finding courage and hope for the next faithful step.', thumbnailUrl: photo('photo-1438232992991-995b7058bbb3') },
    ];
    for (const input of sermonRows) {
      const existing = await sermons.findOneBy({ slug: input.slug });
      await sermons.save(sermons.create({
        ...existing, ...input, speakerId: speakerIds.get(input.speaker) ?? null,
        audioUrl: null, videoUrl: null, status: PublicationStatus.PUBLISHED,
        allowDownload: true,
      }));
    }

    const contentRows = [
      { type: 'services' as const, title: 'Sunday Worship', slug: 'sunday-worship', description: 'A welcoming service with music, prayer, and a message for everyday life.', details: { serviceType: 'Worship service', scheduleType: 'weekly', dayOfWeek: 0, startTime: '09:00', endTime: '10:30', location: 'Main sanctuary', targetAudience: 'Everyone', active: true, displayOrder: 0, publicationStatus: 'published' } },
      { type: 'services' as const, title: 'Midweek Bible Study', slug: 'midweek-bible-study', description: 'Read Scripture together, ask questions, and share life over tea.', details: { serviceType: 'Bible study', scheduleType: 'weekly', dayOfWeek: 3, startTime: '18:00', endTime: '19:15', location: 'Community room', targetAudience: 'Adults', active: true, displayOrder: 1, publicationStatus: 'published' } },
      { type: 'services' as const, title: 'Youth Gathering', slug: 'youth-gathering', description: 'An evening of friendship, worship, and honest conversation for young people.', details: { serviceType: 'Youth service', scheduleType: 'weekly', dayOfWeek: 5, startTime: '17:30', endTime: '19:00', location: 'Youth hall', targetAudience: 'Youth', active: true, displayOrder: 2, publicationStatus: 'published' } },
      { type: 'announcements' as const, title: 'A warm welcome to new visitors', slug: 'welcome-new-visitors', description: 'Join us after Sunday worship for coffee and a short welcome from the team.', details: { category: 'CHURCH_NEWS', imageUrl: photo('photo-1511632765486-a01980e01a18'), publicationDate: now.toISOString(), expiryDate: null, status: 'PUBLISHED' } },
      { type: 'announcements' as const, title: 'Volunteer sign-ups are open', slug: 'volunteer-signups', description: 'There are simple ways to help with hospitality, children’s ministry, and community care.', details: { category: 'COMMUNITY_OUTREACH', imageUrl: photo('photo-1531206715517-5c0ba140b2b8'), publicationDate: now.toISOString(), expiryDate: null, status: 'PUBLISHED' } },
      { type: 'testimonials' as const, title: 'Amina N.', slug: 'amina-n', description: 'I found people who welcomed me from the first Sunday. This community has helped my faith grow and given my family a place to belong.', details: { consentApproved: true, role: 'Member for three years', imageUrl: photo('photo-1534528741775-53994a69daeb', 160) } },
      { type: 'testimonials' as const, title: 'Samuel K.', slug: 'samuel-k', description: 'Serving with the youth team has been a joy. I have grown as a leader while building friendships that matter.', details: { consentApproved: true, role: 'Youth volunteer', imageUrl: photo('photo-1500648767791-00dcc994a43e', 160) } },
      { type: 'testimonials' as const, title: 'Grace M.', slug: 'grace-m', description: 'The church gave me practical support during a hard season and reminded me that I did not have to walk alone.', details: { consentApproved: true, role: 'Community member', imageUrl: photo('photo-1544005313-94ddf0286df2', 160) } },
      { type: 'leaders' as const, title: 'Pastor Jean M.', slug: 'pastor-jean-m', description: 'Pastor and teacher', details: { displayOrder: 0, imageUrl: photo('photo-1560250097-0b93528c311a', 600) } },
      { type: 'leaders' as const, title: 'Pastor Aline N.', slug: 'pastor-aline-n', description: 'Pastor and community leader', details: { displayOrder: 1, imageUrl: photo('photo-1580489944761-15a19d654956', 600) } },
    ];
    for (const input of contentRows) {
      const existing = await records.findOneBy({ type: input.type, slug: input.slug });
      const published = true;
      await records.save(records.create({ ...existing, ...input, published, publishedAt: existing?.publishedAt ?? now }));
    }

    await runner.commitTransaction();
    console.log('Homepage demo content seeded successfully.');
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

seedHomepage().catch((error: unknown) => {
  console.error('Homepage seed failed:', error);
  process.exitCode = 1;
});
