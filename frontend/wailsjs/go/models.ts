export namespace config {
	
	export class User {
	    username: string;
	    uuid: string;
	    auth_type: string;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.uuid = source["uuid"];
	        this.auth_type = source["auth_type"];
	    }
	}
	export class Config {
	    nickname: string;
	    index_url: string;
	    base_url: string;
	    auth_token: string;
	    curseforge_api_key: string;
	    jvm_path: string;
	    cache_directory: string;
	    instances_directory: string;
	    bin_directory: string;
	    editor_directory: string;
	    user: User;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nickname = source["nickname"];
	        this.index_url = source["index_url"];
	        this.base_url = source["base_url"];
	        this.auth_token = source["auth_token"];
	        this.curseforge_api_key = source["curseforge_api_key"];
	        this.jvm_path = source["jvm_path"];
	        this.cache_directory = source["cache_directory"];
	        this.instances_directory = source["instances_directory"];
	        this.bin_directory = source["bin_directory"];
	        this.editor_directory = source["editor_directory"];
	        this.user = this.convertValues(source["user"], User);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace editor {
	
	export class Commit {
	    hash: string;
	    message: string;
	    date: string;
	
	    static createFrom(source: any = {}) {
	        return new Commit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hash = source["hash"];
	        this.message = source["message"];
	        this.date = source["date"];
	    }
	}
	export class GitHistory {
	    commits: Commit[];
	    tags: string[];
	
	    static createFrom(source: any = {}) {
	        return new GitHistory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commits = this.convertValues(source["commits"], Commit);
	        this.tags = source["tags"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Project {
	    name: string;
	    path: string;
	    meta: instance.Meta;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.meta = this.convertValues(source["meta"], instance.Meta);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace instance {
	
	export class Asset {
	    name: string;
	    browser_download_url: string;
	    size: number;
	    content_type: string;
	
	    static createFrom(source: any = {}) {
	        return new Asset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.browser_download_url = source["browser_download_url"];
	        this.size = source["size"];
	        this.content_type = source["content_type"];
	    }
	}
	export class Content {
	    name: string;
	    image_url: string;
	    type: string;
	    mod_id: string;
	    file_id: string;
	    source: string;
	    from: string;
	    file: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new Content(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.image_url = source["image_url"];
	        this.type = source["type"];
	        this.mod_id = source["mod_id"];
	        this.file_id = source["file_id"];
	        this.source = source["source"];
	        this.from = source["from"];
	        this.file = source["file"];
	        this.url = source["url"];
	    }
	}
	export class Container {
	    content_type: string;
	    content: Content[];
	
	    static createFrom(source: any = {}) {
	        return new Container(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.content_type = source["content_type"];
	        this.content = this.convertValues(source["content"], Content);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Meta {
	    name: string;
	    description: string;
	    loader: string;
	    loader_version: string;
	    minecraft_version: string;
	    image_url: string;
	    containers: Container[];
	
	    static createFrom(source: any = {}) {
	        return new Meta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.loader = source["loader"];
	        this.loader_version = source["loader_version"];
	        this.minecraft_version = source["minecraft_version"];
	        this.image_url = source["image_url"];
	        this.containers = this.convertValues(source["containers"], Container);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Release {
	    url: string;
	    tag_name: string;
	    name: string;
	    body: string;
	    // Go type: time
	    created_at: any;
	    assets: Asset[];
	    Meta: Meta;
	
	    static createFrom(source: any = {}) {
	        return new Release(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.tag_name = source["tag_name"];
	        this.name = source["name"];
	        this.body = source["body"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.assets = this.convertValues(source["assets"], Asset);
	        this.Meta = this.convertValues(source["Meta"], Meta);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Instance {
	    repo: string;
	    slug: string;
	    releases: Release[];
	
	    static createFrom(source: any = {}) {
	        return new Instance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repo = source["repo"];
	        this.slug = source["slug"];
	        this.releases = this.convertValues(source["releases"], Release);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LocalInstance {
	    repo: string;
	    slug: string;
	    releases: Release[];
	    release?: Release;
	    dev: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LocalInstance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repo = source["repo"];
	        this.slug = source["slug"];
	        this.releases = this.convertValues(source["releases"], Release);
	        this.release = this.convertValues(source["release"], Release);
	        this.dev = source["dev"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

