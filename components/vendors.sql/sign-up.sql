The seller sign-up process on your now-normalized marketplace touches a minimum of five tables, each serving a specific and separated function.Here is the complete list of tables involved in the seller onboarding flow:1. 👥 Core User IdentityThis table is for the individual's login and access control.Table NamePurposeData Inserted/UpdatedusersAuthentication & Individual IdentityNew record for Email, Hashed Password, full_name, and setting the is_seller flag to TRUE.2. 🏢 Business and Shop DetailsThis table captures the public and administrative identity of the seller's shop.Table NamePurposeData Inserted/UpdatedbusinessesSeller ProfileNew record including Shop Name, Legal Business Name, Registration/Tax ID, primary_category, and the Foreign Key link to the individual user (user_id).3. 🏦 Financial DetailsThis is a critical step for a marketplace to enable payouts and maintain an audit trail.Table NamePurposeData Inserted/Updatedvendor_bank_accountsPayout InformationAccount Holder Name, Bank Name, Account Number, and the Foreign Key link to the business (business_id).4. 🖼️ Supporting Content and AssetsThese tables are necessary to establish the shop's identity and basic compliance.Table NamePurposeData Inserted/UpdatedmediaLogo/Banner UploadInsertion of the shop logo/banner file. The resulting media.id is then linked back to the businesses table via a Foreign Key (logo_media_id—assuming you've added this column).business_contentPolicy DraftsInsertion of the initial rich-text content for the seller's mandatory Return Policy and Shipping Policy drafts.This clear separation ensures your system is robust, scalable, and adheres to normalization principles!

users table 
[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "instance_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "aud",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "role",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'seller'::text"
  },
  {
    "column_name": "email",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "encrypted_password",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "email_confirmed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "invited_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "confirmation_token",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "confirmation_sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "recovery_token",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "recovery_sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "newsletter_subscribed",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "email_change_token_new",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "marketing_consent",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "email_change",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "email_change_sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "terms_accepted",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "last_sign_in_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "account_status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "raw_app_meta_data",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "raw_user_meta_data",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "is_seller",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "is_super_admin",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "is_admin",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "NULL::character varying"
  },
  {
    "column_name": "phone_confirmed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "phone_change",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "''::character varying"
  },
  {
    "column_name": "phone_change_token",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "''::character varying"
  },
  {
    "column_name": "phone_change_sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "confirmed_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "email_change_token_current",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "''::character varying"
  },
  {
    "column_name": "email_change_confirm_status",
    "data_type": "smallint",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "column_name": "banned_until",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "reauthentication_token",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": "''::character varying"
  },
  {
    "column_name": "reauthentication_sent_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "is_sso_user",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "column_name": "deleted_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "is_anonymous",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "false"
  }
]

businesses table 

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "shop_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "slug",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "bank_details",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "commission_rate",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": "10.00"
  },
  {
    "column_name": "follower_count",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "primary_category",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "logo_media_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "banner_media_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  }
]
vendor_bank_accounts

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "column_name": "vendor_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "bank_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "account_holder_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "account_number",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "routing_number",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "swift_code",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "currency",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'KES'::text"
  },
  {
    "column_name": "is_primary",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "is_verified",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "business_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]

media table

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "column_name": "product_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "image_url",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "storage_path",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "is_main",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "media_type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "video_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "provider",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "alt_text",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "position",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "mime_type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "width",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "height",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "duration",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "thumbnail_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "file_size",
    "data_type": "bigint",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "original_filename",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "duration_seconds",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "checksum",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "uploaded_by",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "thumbnail_storage_path",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "upload_source",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'user_upload'::text"
  },
  {
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "variant_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  }
]

and business_content

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "column_name": "business_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "content_type",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "title",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "content_body",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "sort_order",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "true"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]

The primary functions fall into two categories: CRUD Operations (Create, Read, Update, Delete) and Workflow Orchestration (managing the multi-step process).

Here is a breakdown of the essential functions required to handle the data insertion and updates across the five tables.

💻 Essential Backend Functions for Seller Onboarding
1. 👥 Step 1: User Identity (API Endpoint: /register)
Function Name	Action	Logic / Data Handled
create_user_and_flag_seller	CREATE	1. Hash the provided password. 2. Insert new user record into users table. 3. Set is_seller = TRUE and role = 'seller'. 4. Return the new user_id (a UUID).
send_confirmation_email	ACTION	1. Generate a unique confirmation token. 2. Update users with the token. 3. Call external email service to send the verification link.

Export to Sheets

2. 🏢 Step 2: Business Profile (API Endpoint: /onboarding/business-details)
Function Name	Action	Logic / Data Handled
create_business_profile	CREATE	1. Validate shop_name uniqueness. 2. Generate slug (e.g., lowercase, replace spaces with hyphens, ensure uniqueness). 3. Insert new record into businesses table, using the FK (user_id). 4. Return the new business_id.
update_user_onboarding_status	UPDATE	Update the user's progress flag (e.g., a status column in users or businesses) to track completion of Step 2.

Export to Sheets

3. 🏦 Step 3: Financial Details (API Endpoint: /onboarding/bank-details)
Function Name	Action	Logic / Data Handled
add_vendor_bank_account	CREATE	1. Insert new record into vendor_bank_accounts table, using the FK (business_id). 2. Set is_primary = TRUE for the first account. 3. Call External Payment API (Stripe, etc.) to store the account safely and initiate verification. 4. Set is_verified = FALSE.
handle_bank_verification_webhook	ACTION	Triggered by the external payment service. Updates the is_verified column in vendor_bank_accounts to TRUE upon success.

Export to Sheets

4. 🖼️ Step 4: Content and Assets (API Endpoint: /onboarding/assets-policies)
Function Name	Action	Logic / Data Handled
process_media_upload	CREATE	1. Upload file (Logo/Banner) to an external cloud service (S3/GCS). 2. Record metadata (URL, file size, mime type) in the media table. 3. Return the new media.id.
link_media_to_business	UPDATE	Use the returned media.id to UPDATE the businesses table, setting the logo_media_id or banner_media_id column.
initialize_default_content	CREATE	1. Insert two records into the business_content table: one for content_type='RETURN_POLICY' and one for content_type='SHIPPING_POLICY'. 2. Link both using the FK (business_id).

Export to Sheets

🚦 Workflow Orchestration
Beyond the simple data functions, you need a high-level function to manage the entire process and ensure data integrity through database transactions.

Function Name	Purpose
complete_onboarding_transaction	Wraps multiple steps (like Step 4) in a single atomic transaction. If the logo upload fails but the policy insertion succeeds, the system should ROLLBACK the entire step to prevent incomplete data states.
check_seller_onboarding_completion	A gatekeeping function that checks all prerequisite flags before marking the seller as fully active.

Export to Sheets

Final Check Logic (Example):
IF (user.is_seller = TRUE)
AND (business exists for user)
AND (vendor_bank_accounts.is_verified = TRUE)
AND (business_content has both RETURN_POLICY and SHIPPING_POLICY)
THEN
    SET business.status = 'ACTIVE'
END IF

he following is the complete PostgreSQL SQL DDL (Data Definition Language) to define the schema, including Primary Keys (PKs), Foreign Keys (FKs), and other constraints for the five tables involved in the seller sign-up process.

This SQL is designed to enforce the referential integrity and normalization principles described.

🛠️ Setup: Extensions
We'll assume you need the uuid-ossp extension to generate UUIDs for primary keys.

SQL

-- Ensure the UUID extension is enabled (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
1. 👥 users Table (Core User Identity)
This table handles individual login and basic identity.

SQL

CREATE TABLE IF NOT EXISTS users (
    -- PK: Main user identifier
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Authentication & Identity
    email character varying NOT NULL UNIQUE, -- Must be unique for login
    encrypted_password character varying,
    full_name text,
    
    -- Role & Status
    role text DEFAULT 'seller'::text,
    is_seller boolean DEFAULT false, -- The key flag for marketplace access
    is_admin boolean DEFAULT false,
    
    -- Timestamps & Verification
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    
    -- Primary Key Constraint
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Index for quick email lookups during login
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
2. 🏢 businesses Table (Business and Shop Details)
This table holds the public-facing shop profile and links directly to the users table.

SQL

CREATE TABLE IF NOT EXISTS businesses (
    -- PK: Main business identifier
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    
    -- FK to users: Enforces that a business must belong to one user
    user_id uuid NOT NULL UNIQUE, -- UNIQUE enforces a 1:1 relationship (one user = one business)
    
    -- Public Details
    shop_name text NOT NULL UNIQUE, -- Publicly visible shop name, must be unique
    slug text NOT NULL UNIQUE, -- URL-friendly identifier, must be unique
    description text,
    primary_category text,
    
    -- FKs for uploaded assets (logo/banner)
    logo_media_id uuid,
    banner_media_id uuid,
    
    -- Financial/Operational
    commission_rate numeric DEFAULT 10.00,
    follower_count integer DEFAULT 0,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Primary Key Constraint
    CONSTRAINT businesses_pkey PRIMARY KEY (id),
    
    -- Foreign Key Constraint to link business to the user
    CONSTRAINT fk_user
        FOREIGN KEY (user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE -- If a user is deleted, their business profile is deleted
);
3. 🏦 vendor_bank_accounts Table (Financial Details)
This table stores payout details and links to the businesses table.

SQL

CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
    -- PK: Main bank account identifier
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    
    -- FK to businesses: Link to the parent business
    business_id uuid, 
    
    -- Account Details
    bank_name text NOT NULL,
    account_holder_name text NOT NULL,
    account_number text NOT NULL,
    routing_number text,
    swift_code text,
    currency text DEFAULT 'KES'::text,
    
    -- Status Flags
    is_primary boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Primary Key Constraint
    CONSTRAINT vendor_bank_accounts_pkey PRIMARY KEY (id),
    
    -- Foreign Key Constraint to link bank account to the business
    CONSTRAINT fk_business
        FOREIGN KEY (business_id) 
        REFERENCES businesses(id)
        ON DELETE CASCADE -- If a business is deleted, their bank details should be deleted
);
4. 🖼️ media Table (Supporting Content/Assets)
This table is for file uploads, like the business logo and banner. It contains a lot of metadata about the file.

SQL

CREATE TABLE IF NOT EXISTS media (
    -- PK: Main media file identifier
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    
    -- Core File Info
    image_url text NOT NULL,
    storage_path text,
    mime_type text,
    file_size bigint,
    
    -- Context/Metadata (NOTE: Assuming product_id is not strictly needed for sign-up, but kept)
    product_id uuid, 
    media_type text,
    original_filename text,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Primary Key Constraint
    CONSTRAINT media_pkey PRIMARY KEY (id)
    
    -- Note: No direct FK here. The businesses table holds the FK link (logo_media_id/banner_media_id)
);

-- Now, add the FK constraints back to the `businesses` table, referencing `media(id)`
ALTER TABLE businesses
ADD CONSTRAINT fk_logo_media
    FOREIGN KEY (logo_media_id)
    REFERENCES media(id)
    ON DELETE SET NULL; -- If the media file is deleted, set the link to NULL (don't delete the business)

ALTER TABLE businesses
ADD CONSTRAINT fk_banner_media
    FOREIGN KEY (banner_media_id)
    REFERENCES media(id)
    ON DELETE SET NULL;
5. business_content Table (Policy Drafts)
This table stores rich-text content for shop-specific policies.

SQL

CREATE TABLE IF NOT EXISTS business_content (
    -- PK: Main content identifier
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    
    -- FK to businesses: Link to the parent business
    business_id uuid NOT NULL,
    
    -- Content Details
    content_type character varying NOT NULL, -- e.g., 'RETURN_POLICY', 'SHIPPING_POLICY'
    title character varying NOT NULL,
    content_body text NOT NULL,
    
    -- Status
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Primary Key Constraint
    CONSTRAINT business_content_pkey PRIMARY KEY (id),
    
    -- Foreign Key Constraint to link content to the business
    CONSTRAINT fk_business_content
        FOREIGN KEY (business_id) 
        REFERENCES businesses(id)
        ON DELETE CASCADE, -- If a business is deleted, its content is deleted
        
    -- Unique Constraint: A business should only have one of each content type active at a time
    CONSTRAINT uq_business_content_type UNIQUE (business_id, content_type)