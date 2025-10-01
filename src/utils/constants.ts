// WordPress readme.txt parsing and validation constants

export const WORDPRESS_VERSIONS = [
  '6.4', '6.3', '6.2', '6.1', '6.0',
  '5.9', '5.8', '5.7', '5.6', '5.5', '5.4', '5.3', '5.2', '5.1', '5.0',
  '4.9', '4.8', '4.7', '4.6', '4.5', '4.4', '4.3', '4.2', '4.1', '4.0'
];

export const PHP_VERSIONS = [
  '8.3', '8.2', '8.1', '8.0',
  '7.4', '7.3', '7.2', '7.1', '7.0',
  '5.6', '5.5', '5.4', '5.3'
];

export const COMMON_TAGS = [
  'admin', 'ajax', 'api', 'authentication', 'backup', 'block', 'blocks',
  'comments', 'custom-post-type', 'dashboard', 'database', 'e-commerce',
  'email', 'forms', 'gallery', 'google', 'gutenberg', 'images', 'import',
  'integration', 'jquery', 'media', 'menu', 'migration', 'navigation',
  'notification', 'optimization', 'payment', 'plugin', 'post', 'posts',
  'responsive', 'security', 'seo', 'shortcode', 'sidebar', 'social',
  'taxonomy', 'theme', 'translation', 'twitter', 'users', 'widget',
  'widgets', 'woocommerce', 'wordpress'
];

export const STANDARD_SECTIONS = [
  'Description',
  'Installation', 
  'Frequently Asked Questions',
  'Screenshots',
  'Changelog',
  'Upgrade Notice'
];

export const GPL_COMPATIBLE_LICENSES = [
  'GPL',
  'GPLv2',
  'GPLv3', 
  'GPL v2',
  'GPL v3',
  'GPL-2.0',
  'GPL-3.0',
  'GPLv2 or later',
  'GPLv3 or later',
  'MIT',
  'Apache',
  'Apache-2.0',
  'BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'LGPL',
  'LGPLv2',
  'LGPLv3'
];

export const VALIDATION_RULES = {
  SHORT_DESCRIPTION_MAX_LENGTH: 150,
  TAGS_MAX_COUNT: 5,
  TAGS_MIN_COUNT: 1,
  UPGRADE_NOTICE_MAX_LENGTH: 300,
  FILE_SIZE_MAX_BYTES: 10 * 1024, // 10KB
  PLUGIN_NAME_MIN_LENGTH: 3,
  PLUGIN_NAME_MAX_LENGTH: 60
};

export const REGEX_PATTERNS = {
  VERSION: /^\d+\.\d+(\.\d+)?$/,
  URL: /^https?:\/\/.+\..+/i,
  WORDPRESS_USERNAME: /^[a-z0-9_-]{3,60}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PLUGIN_NAME: /^===\s*(.+?)\s*===$/,
  SECTION_HEADER: /^==\s*(.+?)\s*==$/,
  FAQ_QUESTION: /^=\s*(.+?)\s*=$/,
  VERSION_HEADER: /^=\s*([\d.]+)\s*=$/
};

export interface WordPressReadmeSpec {
  requiredFields: string[];
  optionalFields: string[];
  standardSections: string[];
  markdownSubset: string[];
}

export const WORDPRESS_README_SPEC: WordPressReadmeSpec = {
  requiredFields: [
    'Plugin Name',
    'Contributors', 
    'Tags',
    'Requires at least',
    'Tested up to',
    'Stable tag',
    'License',
    'Short Description'
  ],
  optionalFields: [
    'Donate link',
    'Requires PHP',
    'License URI'
  ],
  standardSections: STANDARD_SECTIONS,
  markdownSubset: [
    'headers',
    'emphasis',
    'links', 
    'lists',
    'code',
    'blockquotes',
    'videos'
  ]
};