import type { EntityManager } from 'typeorm';
import { ContentRecord } from '../../app/modules/content/content.entity';
import { Ministry } from '../../app/modules/ministries/entities/ministry.entity';
import { PublicationStatus } from '../../app/modules/sermons/entities/sermon.entity';

const churchName = 'Seventh-day Adventist Fellowship';
const image = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;

const homepage = {
  contentKey: 'homepage',
  hero: {
    heading: 'Rooted in Scripture.\nResting in the Sabbath.\nSharing hope in Jesus.',
    description:
      'A Bible-centered Christian community that worships on the seventh-day Sabbath and seeks to serve with the compassion of Jesus.',
    imageUrl: image('photo-1507692049790-de58290a4334', 2200),
    imageAlt: 'A church sanctuary prepared for worship',
    visible: true,
    primaryCtaLabel: 'Explore our beliefs',
    primaryCtaHref: '/about/beliefs',
    secondaryCtaLabel: 'Plan a visit',
    secondaryCtaHref: '/plan-your-visit',
  },
  sections: {
    welcome: {
      visible: true,
      order: 0,
      heading: 'A place to worship, learn, and serve',
      description:
        'Discover a Christ-centered community shaped by Scripture, Sabbath worship, prayer, and practical care for others.',
      imageUrl: image('photo-1511632765486-a01980e01a18'),
      imageAlt: 'People sharing fellowship',
      primaryCtaLabel: 'What we believe',
      primaryCtaHref: '/about/beliefs',
    },
    facts: { visible: false, order: 1, heading: '', description: '' },
    services: {
      visible: true,
      order: 2,
      heading: 'Gather on the Sabbath',
      description:
        'The seventh-day Sabbath is a time for worship, rest, Bible study, and fellowship. Ask the local congregation to confirm current meeting details.',
    },
    about: {
      visible: true,
      order: 3,
      heading: 'Faith grounded in Scripture',
      description:
        'Seventh-day Adventists look to the Bible as the foundation for faith and follow Jesus with hope in His promised return.',
      primaryCtaLabel: 'Read our beliefs',
      primaryCtaHref: '/about/beliefs',
    },
    ministries: {
      visible: true,
      order: 4,
      heading: 'Grow and serve together',
      description:
        'Find ways to learn Scripture, support families, encourage young people, worship, and care for neighbors.',
      limit: 5,
      featuredMinistryIds: [],
    },
    events: { visible: false, order: 5, heading: '', description: '', limit: 0 },
    announcements: { visible: false, order: 6, heading: '', description: '', limit: 0 },
    sermons: { visible: false, order: 7, heading: '', description: '', limit: 0 },
    testimonials: { visible: false, order: 8, heading: '', description: '', limit: 0 },
    gallery: { visible: false, order: 9, heading: '', description: '', limit: 0 },
    contact: {
      visible: true,
      order: 10,
      heading: 'Come learn and worship with us',
      description:
        'Contact the local congregation for its verified address, service time, and visit information.',
      primaryCtaLabel: 'Plan a visit',
      primaryCtaHref: '/plan-your-visit',
      secondaryCtaLabel: 'Send a message',
      secondaryCtaHref: '/contact',
    },
  },
};

const churchInformation = {
  contentKey: 'church-information',
  profile: {
    history:
      'A congregation in the Seventh-day Adventist Christian tradition, centered on Jesus and guided by the Bible. We gather for seventh-day Sabbath worship, study Scripture, and seek to serve our neighbors.',
    imageUrl: image('photo-1438232992991-995b7058bbb3'),
    imageAlt: 'Congregation gathered for worship',
    logoUrl: '/logo-c.png',
    logoAlt: 'Church logo',
  },
  contact: {
    city: '',
    country: '',
    address: '',
    phone: '',
    email: '',
    directionsUrl: '',
    mapUrl: '',
  },
  mission: {
    heading: 'Our mission',
    statement:
      'To help people understand the Bible and find freedom, healing, and hope in Jesus.',
    description:
      'We share the hope of the gospel through worship, Bible study, discipleship, and compassionate service.',
    visible: true,
  },
  vision: {
    heading: 'Our vision',
    statement:
      'A community growing in Christ and serving with hope while looking forward to His promised return.',
    description:
      'We seek to make room for people to know Jesus, grow in faith, and care for one another.',
    visible: true,
  },
  coreValues: [
    { title: 'Scripture', description: 'We look to the Bible as the foundation for faith and life.', order: 0, visible: true },
    { title: 'Christ', description: 'We center our faith on the life, death, and resurrection of Jesus.', order: 1, visible: true },
    { title: 'Sabbath', description: 'We welcome the seventh-day Sabbath as a time for worship, rest, and fellowship.', order: 2, visible: true },
    { title: 'Service', description: 'We seek to reflect the compassion of Jesus in practical care for others.', order: 3, visible: true },
  ],
  beliefs: [
    { title: 'The Bible', description: 'The Old and New Testaments are the inspired Word of God and the foundation for Christian faith.', order: 0, visible: true },
    { title: 'God', description: 'We believe in one God: Father, Son, and Holy Spirit.', order: 1, visible: true },
    { title: 'Jesus Christ', description: 'Jesus is Savior and Lord. His life, death, and resurrection reveal God’s love and offer salvation.', order: 2, visible: true },
    { title: 'The Sabbath', description: 'The seventh day is a Sabbath for worship, rest, and fellowship, remembering God as Creator and Redeemer.', order: 3, visible: true },
    { title: 'The Second Coming', description: 'We look forward to the personal and visible return of Jesus Christ and the restoration of all things.', order: 4, visible: true },
    { title: 'Christian Service', description: 'The Holy Spirit gives gifts that equip believers to serve the church and share the hope of the gospel.', order: 5, visible: true },
  ],
  socialLinks: [],
};

const ministries = [
  {
    slug: 'sabbath-school-bible-study',
    name: 'Sabbath School & Bible Study',
    description:
      'Study the Bible, ask questions, and grow in understanding through conversation and prayer.',
    targetAudience: 'All ages',
    imageUrl: image('photo-1504052434569-70ad5836ab65', 800),
  },
  {
    slug: 'children-and-families',
    name: 'Children & Families',
    description:
      'Encourage children and families as they learn Bible stories, build friendships, and grow in faith.',
    targetAudience: 'Children and families',
    imageUrl: image('photo-1485546246426-74dc88dec4d9', 800),
  },
  {
    slug: 'youth-and-young-adults',
    name: 'Youth & Young Adults',
    description:
      'Create space for young people to explore faith, support one another, and serve their community.',
    targetAudience: 'Youth and young adults',
    imageUrl: image('photo-1529156069898-49953e39b3ac', 800),
  },
  {
    slug: 'worship-and-music',
    name: 'Worship & Music',
    description:
      'Use music, prayer, and shared worship to encourage the congregation and honor God.',
    targetAudience: 'The congregation',
    imageUrl: image('photo-1516450360452-9312f5e86fc7', 800),
  },
  {
    slug: 'community-care',
    name: 'Community Care',
    description:
      'Put faith into action through kindness, practical support, and care for neighbors.',
    targetAudience: 'Neighbors and volunteers',
    imageUrl: image('photo-1531206715517-5c0ba140b2b8', 800),
  },
];

export async function seedSeventhDayContent(manager: EntityManager) {
  const now = new Date();
  const records = manager.getRepository(ContentRecord);
  const settings = [
    {
      type: 'settings' as const,
      title: churchName,
      slug: 'church-information',
      description:
        'A Bible-centered Seventh-day Adventist community focused on worship, spiritual growth, and compassionate service.',
      details: churchInformation,
    },
    {
      type: 'settings' as const,
      title: 'Home',
      slug: 'homepage',
      description: 'Homepage content for the Seventh-day Adventist community.',
      details: homepage,
    },
  ];

  for (const setting of settings) {
    await records.save(
      records.create({ ...setting, published: true, publishedAt: now }),
    );
  }

  const worshipService = records.create({
    type: 'services',
    title: 'Sabbath Worship',
    slug: 'sabbath-worship',
    description:
      'Gather for worship, prayer, and fellowship on the seventh-day Sabbath. Confirm the local gathering time and location with the congregation.',
    details: {
      serviceType: 'Worship service',
      scheduleType: 'weekly',
      dayOfWeek: 6,
      startTime: '',
      endTime: '',
      location: '',
      targetAudience: 'Everyone',
      instructions: 'Contact the local congregation to confirm current details.',
      active: true,
      displayOrder: 0,
      publicationStatus: 'published',
    },
    published: true,
    publishedAt: now,
  });
  await records.save(worshipService);

  const ministryRepository = manager.getRepository(Ministry);
  for (const ministry of ministries) {
    await ministryRepository.save(
      ministryRepository.create({
        ...ministry,
        status: PublicationStatus.PUBLISHED,
      }),
    );
  }
}
